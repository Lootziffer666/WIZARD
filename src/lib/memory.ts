/**
 * Produktionsgedächtnis (assetpilot.md: „Asset Pilot merkt nicht nur: dieses
 * Asset existiert. Sondern: dieses Asset hat sich in DIESEM Kontext bewährt.").
 *
 * Erfahrungen liegen als Zeilen in der SQLite-Wissensbasis:
 *   assetId + Kontext (freie Tags/Wörter) + verdict (bewährt|problematisch)
 *   + optionale Kombination (z. B. shader/lighting) + Notiz.
 *
 * `memoryBoosts(text)` matcht einen Brief-/Suchkontext gegen die gespeicherten
 * Kontexte und liefert pro Asset einen Score-Bonus/Malus plus die belegenden
 * Einträge — damit „richtige Assets für diese Welt" vor „irgendwelche Treffer"
 * landen und bekannte Fehlgriffe markiert werden.
 */

import { getDb } from "./db";

export type MemoryVerdict = "bewährt" | "problematisch";

export interface MemoryRecord {
  id: number;
  assetId: string;
  context: string;
  verdict: MemoryVerdict;
  combo: Record<string, string> | null;
  note: string;
  createdAt: number;
}

export interface MemoryBoost {
  boost: number;
  proven: string[];
  warnings: string[];
}

let schemaReady = false;

async function ensureMemorySchema(): Promise<void> {
  if (schemaReady) return;
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS production_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId TEXT NOT NULL,
      context TEXT NOT NULL,
      verdict TEXT NOT NULL CHECK (verdict IN ('bewährt', 'problematisch')),
      combo TEXT,
      note TEXT,
      createdAt INTEGER NOT NULL
    )
  `);
  schemaReady = true;
}

export async function recordMemory(entry: {
  assetId: string;
  context: string;
  verdict: MemoryVerdict;
  combo?: Record<string, string>;
  note?: string;
}): Promise<MemoryRecord> {
  await ensureMemorySchema();
  const createdAt = Date.now();
  const result = await getDb().execute({
    sql: `INSERT INTO production_memory (assetId, context, verdict, combo, note, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      entry.assetId,
      entry.context,
      entry.verdict,
      entry.combo ? JSON.stringify(entry.combo) : null,
      entry.note ?? "",
      createdAt,
    ],
  });
  return {
    id: Number(result.lastInsertRowid ?? 0),
    assetId: entry.assetId,
    context: entry.context,
    verdict: entry.verdict,
    combo: entry.combo ?? null,
    note: entry.note ?? "",
    createdAt,
  };
}

interface MemoryRow {
  id: number;
  assetId: string;
  context: string;
  verdict: MemoryVerdict;
  combo: string | null;
  note: string;
  createdAt: number;
}

function rowToRecord(r: MemoryRow): MemoryRecord {
  let combo: Record<string, string> | null = null;
  if (r.combo) {
    try {
      combo = JSON.parse(r.combo) as Record<string, string>;
    } catch {
      combo = null;
    }
  }
  return { ...r, combo };
}

export async function listMemory(assetId?: string): Promise<MemoryRecord[]> {
  await ensureMemorySchema();
  const result = assetId
    ? await getDb().execute({
        sql: "SELECT * FROM production_memory WHERE assetId = ? ORDER BY createdAt DESC",
        args: [assetId],
      })
    : await getDb().execute("SELECT * FROM production_memory ORDER BY createdAt DESC LIMIT 500");
  return (result.rows as unknown as MemoryRow[]).map(rowToRecord);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-zäöüß0-9-]+/)
      .filter((t) => t.length > 2)
  );
}

/**
 * Matcht einen Kontext-Text gegen alle Gedächtnis-Einträge.
 * Boost je Eintrag = Anzahl gemeinsamer Kontext-Tokens (positiv für bewährt,
 * negativ für problematisch); belegende Einträge werden mitgeliefert.
 */
export async function memoryBoosts(contextText: string): Promise<Map<string, MemoryBoost>> {
  await ensureMemorySchema();
  const ctx = tokens(contextText);
  const boosts = new Map<string, MemoryBoost>();
  if (ctx.size === 0) return boosts;

  for (const rec of await listMemory()) {
    const overlap = [...tokens(rec.context)].filter((t) => ctx.has(t));
    if (overlap.length === 0) continue;
    const entry = boosts.get(rec.assetId) ?? { boost: 0, proven: [], warnings: [] };
    const summary = `${rec.context}${rec.note ? ` — ${rec.note}` : ""}`;
    if (rec.verdict === "bewährt") {
      entry.boost += overlap.length;
      entry.proven.push(summary);
    } else {
      entry.boost -= overlap.length;
      entry.warnings.push(summary);
    }
    boosts.set(rec.assetId, entry);
  }
  return boosts;
}
