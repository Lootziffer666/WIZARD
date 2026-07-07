import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
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

const DB_PATH = join(process.cwd(), "data", "assets.db");
const SEED_PATH = join(process.cwd(), "src", "data", "assets.json");

const g = globalThis as unknown as { __assetsDb?: DatabaseType };

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

function ensureSchema(db: DatabaseType) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      publisher TEXT NOT NULL,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      image TEXT,
      addedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_platform ON assets(platform);
    CREATE INDEX IF NOT EXISTS idx_assets_publisher ON assets(publisher);

    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
      id UNINDEXED,
      title,
      category,
      publisher,
      tokenize = 'unicode61'
    );
  `);
}

function seedIfEmpty(db: DatabaseType) {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM assets").get() as {
    c: number;
  }).c;
  if (count > 0) return;
  if (!existsSync(SEED_PATH)) {
    throw new Error(`Seed file not found: ${SEED_PATH}`);
  }
  const assets = JSON.parse(readFileSync(SEED_PATH, "utf8")) as LibraryAsset[];

  const insertAsset = db.prepare(
    `INSERT OR REPLACE INTO assets (id, title, category, publisher, platform, url, image, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertFts = db.prepare(
    `INSERT INTO assets_fts (id, title, category, publisher) VALUES (?, ?, ?, ?)`
  );

  const tx = db.transaction((rows: LibraryAsset[]) => {
    for (const a of rows) {
      insertAsset.run(
        a.id,
        a.title,
        a.category,
        a.publisher,
        a.platform,
        a.url,
        a.image,
        a.addedAt
      );
      insertFts.run(a.id, a.title, a.category, a.publisher);
    }
  });
  tx(assets);
}

export function getDb(): DatabaseType {
  if (g.__assetsDb) return g.__assetsDb;
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  ensureSchema(db);
  seedIfEmpty(db);
  g.__assetsDb = db;
  return db;
}

function buildMatch(query: string): string {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, "").trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"*`).join(" ");
}

export function searchLibrary(params: SearchParams = {}): LibraryAsset[] {
  const db = getDb();
  const { query = "", category, platform, publisher, limit = 60 } = params;
  const match = buildMatch(query);

  const clauses: string[] = [];
  const bind: unknown[] = [];

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
  return db.prepare(sql).all(...bind) as LibraryAsset[];
}

export function searchAssets(params: SearchParams = {}): Asset[] {
  return searchLibrary(params).map(toAsset);
}

export function getFacets(): Facets {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS c FROM assets").get() as {
    c: number;
  }).c;
  const platforms = (
    db.prepare("SELECT DISTINCT platform FROM assets ORDER BY platform").all() as {
      platform: string;
    }[]
  ).map((r) => r.platform);
  const categories = (
    db.prepare("SELECT DISTINCT category FROM assets ORDER BY category").all() as {
      category: string;
    }[]
  ).map((r) => r.category);
  const publishers = (
    db.prepare("SELECT DISTINCT publisher FROM assets ORDER BY publisher").all() as {
      publisher: string;
    }[]
  ).map((r) => r.publisher);
  return { total, platforms, categories, publishers };
}
