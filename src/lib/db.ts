import { createClient, type Client } from "@libsql/client";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Asset, AssetType } from "./types";

export interface LibraryAsset {
  id: string;
  title: string;
  category: string;
  publisher: string;
  platform: string;
  url: string;
  image: string;
  addedAt: number;
  analysis: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  platform?: string;
  publisher?: string;
  limit?: number;
  /** "or": mindestens ein Suchwort muss treffen (Capability-/Semantik-Suche). Default "and". */
  matchMode?: "and" | "or";
}

export interface Facets {
  total: number;
  categories: string[];
  platforms: string[];
  publishers: string[];
}

function projectRoot(): string {
  return process.cwd();
}

// assets.json is the canonical source. `npm/bun run build` synchronizes this
// database before Next.js is built, so production never needs to parse and seed
// thousands of rows on a request.
const SOURCE_DB_PATH =
  process.env.DATABASE_PATH ?? join(projectRoot(), "data", "assets.db");
const VERCEL_DB_PATH = "/tmp/wizard-assets.db";

const g = globalThis as unknown as {
  __assetsDb?: Client;
  __assetsDbPath?: string;
};

function deriveType(category: string): AssetType {
  const c = category.toLowerCase();
  if (c.includes("characters")) return "SkeletalMesh";
  if (c.includes("animation")) return "Animation";
  if (c.startsWith("audio") || c.includes("sound")) return "Sound";
  if (c.startsWith("vfx") || c.includes("particles")) return "Particle";
  if (c.startsWith("2d")) return "Texture";
  if (c.startsWith("3d")) return "StaticMesh";
  if (c.startsWith("tools") || c.startsWith("templates")) return "Blueprint";
  return "Other";
}

export function toAsset(row: LibraryAsset): Asset {
  const tags = [
    ...row.category.split("/").map((s) => s.trim()).filter(Boolean),
    row.publisher,
  ];
  return {
    id: row.id,
    name: row.title,
    type: deriveType(row.category),
    path: row.url,
    tags,
    thumbnail: `/api/image/${row.id}`,
    description: `${row.publisher} · ${row.category} · ${row.platform}`,
  };
}

function localRuntimeDbPath(): string {
  if (!existsSync(SOURCE_DB_PATH)) {
    throw new Error(
      `Prepared asset database not found at ${SOURCE_DB_PATH}. Run \"bun run prepare:assets\" (or npm run prepare:assets) before starting WIZARD.`
    );
  }

  // Vercel's deployed function bundle is read-only. Copy the already prepared
  // 1-2 MB SQLite file once per cold instance to /tmp instead of creating the
  // schema and issuing thousands of INSERTs at request time.
  if (process.env.VERCEL === "1") {
    if (!existsSync(VERCEL_DB_PATH)) {
      copyFileSync(SOURCE_DB_PATH, VERCEL_DB_PATH);
    }
    return VERCEL_DB_PATH;
  }

  return SOURCE_DB_PATH;
}

export function getDb(): Client {
  if (g.__assetsDb) return g.__assetsDb;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    g.__assetsDb = createClient({ url: dbUrl });
    g.__assetsDbPath = dbUrl;
    return g.__assetsDb;
  }

  const runtimePath = localRuntimeDbPath();
  const db = createClient({ url: `file:${runtimePath}` });

  // Keep the concurrency protection that WIZARD already relied on. This is
  // especially important for parallel tests/local callers and is safe on
  // Vercel because its copy lives in writable /tmp.
  db.executeMultiple(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`);

  g.__assetsDb = db;
  g.__assetsDbPath = runtimePath;
  return db;
}

function buildMatch(query: string, mode: "and" | "or" = "and"): string {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, "").trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"*`).join(mode === "or" ? " OR " : " ");
}

export async function searchLibrary(params: SearchParams = {}): Promise<LibraryAsset[]> {
  const db = getDb();
  const {
    query = "",
    category,
    platform,
    publisher,
    limit = 60,
    matchMode = "and",
  } = params;
  const match = buildMatch(query, matchMode);

  const clauses: string[] = [];
  const bind: (string | number)[] = [];

  if (match) {
    clauses.push("assets_fts MATCH ?");
    bind.push(match);
  }
  if (category) {
    clauses.push("a.category LIKE ?");
    bind.push(`${category}%`);
  }
  if (platform) {
    clauses.push("a.platform = ?");
    bind.push(platform);
  }
  if (publisher) {
    clauses.push("a.publisher LIKE ?");
    bind.push(`%${publisher}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const sql = match
    ? `SELECT a.*, bm25(assets_fts) AS rank
       FROM assets_fts f
       JOIN assets a ON a.id = f.id
       ${where}
       ORDER BY rank
       LIMIT ?`
    : `SELECT a.*
       FROM assets a
       ${where}
       ORDER BY a.addedAt DESC
       LIMIT ?`;

  bind.push(limit);

  const result = await db.execute({ sql, args: bind });
  return result.rows as unknown as LibraryAsset[];
}

export async function searchAssets(params: SearchParams = {}): Promise<Asset[]> {
  return (await searchLibrary(params)).map(toAsset);
}

export async function updateAnalysis(id: string, analysis: string): Promise<void> {
  const db = getDb();
  await db.execute({ sql: "UPDATE assets SET analysis = ? WHERE id = ?", args: [analysis, id] });
  await db.execute({ sql: "UPDATE assets_fts SET analysis = ? WHERE id = ?", args: [analysis, id] });
}

export async function getUnanalyzedIds(limit = 1000): Promise<string[]> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id FROM assets WHERE analysis IS NULL OR analysis = '' LIMIT ?",
    args: [limit],
  });
  return result.rows.map((r) => (r as unknown as { id: string }).id);
}

export async function countAnalyzed(): Promise<{ total: number; analyzed: number }> {
  const db = getDb();
  const total = await db.execute("SELECT COUNT(*) c FROM assets");
  const analyzed = await db.execute(
    "SELECT COUNT(*) c FROM assets WHERE analysis IS NOT NULL AND analysis != ''"
  );
  return {
    total: Number(total.rows[0]?.c ?? 0),
    analyzed: Number(analyzed.rows[0]?.c ?? 0),
  };
}

export async function getFacets(): Promise<Facets> {
  const db = getDb();
  const total = await db.execute("SELECT COUNT(*) AS c FROM assets");
  const platforms = await db.execute("SELECT DISTINCT platform FROM assets ORDER BY platform");
  const categories = await db.execute("SELECT DISTINCT category FROM assets ORDER BY category");
  const publishers = await db.execute("SELECT DISTINCT publisher FROM assets ORDER BY publisher");
  return {
    total: Number(total.rows[0]?.c ?? 0),
    platforms: platforms.rows.map((r) => (r as unknown as { platform: string }).platform),
    categories: categories.rows.map((r) => (r as unknown as { category: string }).category),
    publishers: publishers.rows.map((r) => (r as unknown as { publisher: string }).publisher),
  };
}

export async function getDbStats(): Promise<{ total: number; dbPath: string; mode: string }> {
  const total = await getDb().execute("SELECT COUNT(*) c FROM assets");
  const remote = Boolean(process.env.DATABASE_URL);
  return {
    total: Number(total.rows[0]?.c ?? 0),
    dbPath: g.__assetsDbPath ?? SOURCE_DB_PATH,
    mode: remote
      ? "remote (libsql/turso)"
      : process.env.VERCEL === "1"
        ? "bundled sqlite -> /tmp"
        : "local (file)",
  };
}
