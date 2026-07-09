import { createClient, type Client } from "@libsql/client";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
}

export interface Facets {
  total: number;
  categories: string[];
  platforms: string[];
  publishers: string[];
}

// Stable path: always resolve relative to the project root, not cwd
function projectRoot(): string {
  // In production (Vercel/Kilo) process.cwd() can be unreliable
  // Use import.meta.url to get a stable reference
  try {
    const { fileURLToPath } = require("node:url");
    return fileURLToPath(new URL("../", import.meta.url));
  } catch {
    return process.cwd();
  }
}

const DB_PATH = process.env.DATABASE_PATH ?? join(projectRoot(), "data", "assets.db");
const SEED_PATH = join(projectRoot(), "src", "data", "assets.json");

const g = globalThis as unknown as { __assetsDb?: Client; __dbReady?: boolean };

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

function ensureSchema(db: Client) {
  db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      publisher TEXT NOT NULL,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      image TEXT,
      addedAt INTEGER,
      analysis TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_platform ON assets(platform);
    CREATE INDEX IF NOT EXISTS idx_assets_publisher ON assets(publisher);

    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
      id UNINDEXED,
      title,
      category,
      publisher,
      analysis,
      tokenize = 'unicode61'
    );
  `);
}

async function seedIfEmpty(db: Client) {
  const result = db.execute("SELECT COUNT(*) AS c FROM assets");
  const count = result.rows[0]?.c ?? 0;
  if (count > 0) return;
  if (!existsSync(SEED_PATH)) {
    throw new Error(`Seed file not found: ${SEED_PATH}`);
  }
  const assets = JSON.parse(readFileSync(SEED_PATH, "utf8")) as LibraryAsset[];

  for (const a of assets) {
    await db.execute(
      `INSERT OR REPLACE INTO assets (id, title, category, publisher, platform, url, image, addedAt, analysis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.title, a.category, a.publisher, a.platform, a.url, a.image, a.addedAt, ""]
    );
    await db.execute(
      `INSERT INTO assets_fts (id, title, category, publisher, analysis) VALUES (?, ?, ?, ?, ?)`,
      [a.id, a.title, a.category, a.publisher, ""]
    );
  }
}

export function getDb(): Client {
  if (g.__assetsDb) return g.__assetsDb;

  const dbUrl = process.env.DATABASE_URL;
  const db = createClient(
    dbUrl
      ? { url: dbUrl }
      : {
          // Local file-based SQLite (dev + some serverless deployments)
          url: `file:${DB_PATH}`,
        }
  );

  ensureSchema(db);

  // Seed synchronously on first access for local file mode
  // (for remote turso urls the seed runs async in the background)
  if (!dbUrl) {
    seedIfEmpty(db).catch(console.error);
  }

  g.__assetsDb = db;
  return db;
}

function buildMatch(query: string, mode: "and" | "or" = "and"): string {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, "").trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  const joined = tokens.map((t) => `"${t}"*`).join(mode === "or" ? " OR " : " ");
  return joined;
}

export function searchLibrary(params: SearchParams = {}): LibraryAsset[] {
  const db = getDb();
  const {
    query = "",
    category,
    platform,
    publisher,
    limit = 60,
  } = params;
  const match = buildMatch(query, "and");

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

  const result = db.execute({ sql, args: bind });
  return result.rows as unknown as LibraryAsset[];
}

export function searchAssets(params: SearchParams = {}): Asset[] {
  return searchLibrary(params).map(toAsset);
}

export function updateAnalysis(id: string, analysis: string): void {
  const db = getDb();
  db.execute({ sql: "UPDATE assets SET analysis = ? WHERE id = ?", args: [analysis, id] });
  db.execute({ sql: "UPDATE assets_fts SET analysis = ? WHERE id = ?", args: [analysis, id] });
}

export function getUnanalyzedIds(limit = 1000): string[] {
  const db = getDb();
  const result = db.execute({
    sql: "SELECT id FROM assets WHERE analysis IS NULL OR analysis = '' LIMIT ?",
    args: [limit],
  });
  return result.rows.map((r) => (r as { id: string }).id);
}

export function countAnalyzed(): { total: number; analyzed: number } {
  const db = getDb();
  const total = db.execute("SELECT COUNT(*) c FROM assets");
  const analyzed = db.execute(
    "SELECT COUNT(*) c FROM assets WHERE analysis IS NOT NULL AND analysis != ''"
  );
  return {
    total: total.rows[0]?.c ?? 0,
    analyzed: analyzed.rows[0]?.c ?? 0,
  };
}

export function getFacets(): Facets {
  const db = getDb();
  const total = db.execute("SELECT COUNT(*) AS c FROM assets");
  const platforms = db.execute("SELECT DISTINCT platform FROM assets ORDER BY platform");
  const categories = db.execute("SELECT DISTINCT category FROM assets ORDER BY category");
  const publishers = db.execute("SELECT DISTINCT publisher FROM assets ORDER BY publisher");
  return {
    total: total.rows[0]?.c ?? 0,
    platforms: platforms.rows.map((r) => (r as { platform: string }).platform),
    categories: categories.rows.map((r) => (r as { category: string }).category),
    publishers: publishers.rows.map((r) => (r as { publisher: string }).publisher),
  };
}

export function getDbStats(): { total: number; dbPath: string; mode: string } {
  return {
    total: (getDb().execute("SELECT COUNT(*) c FROM assets").rows[0]?.c ?? 0) as number,
    dbPath: DB_PATH,
    mode: process.env.DATABASE_URL ? "remote (libsql/turso)" : "local (file)",
  };
}