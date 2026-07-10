import { createClient } from "@libsql/client";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH ?? join(ROOT, "data", "assets.db");
const SEED_PATH = join(ROOT, "src", "data", "assets.json");

mkdirSync(join(ROOT, "data"), { recursive: true });
const db = createClient({ url: `file:${DB_PATH}` });

// Same schema as src/lib/db.ts ensureSchema — keep the two in sync.
await db.executeMultiple(`
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
    id UNINDEXED, title, category, publisher, analysis, tokenize='unicode61'
  );
`);

const countResult = await db.execute("SELECT COUNT(*) c FROM assets");
const count = Number(countResult.rows[0]?.c ?? 0);
if (count > 0) {
  console.log(`DB already seeded (${count} assets).`);
  process.exit(0);
}

const assets = JSON.parse(readFileSync(SEED_PATH, "utf8"));
const CHUNK = 200;
for (let i = 0; i < assets.length; i += CHUNK) {
  const chunk = assets.slice(i, i + CHUNK);
  await db.batch(
    chunk.flatMap((a) => [
      {
        sql: "INSERT OR REPLACE INTO assets (id,title,category,publisher,platform,url,image,addedAt,analysis) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [a.id, a.title, a.category, a.publisher, a.platform, a.url, a.image, a.addedAt, ""],
      },
      {
        sql: "INSERT INTO assets_fts (id,title,category,publisher,analysis) VALUES (?,?,?,?,?)",
        args: [a.id, a.title, a.category, a.publisher, ""],
      },
    ]),
    "write"
  );
}
console.log(`Seeded ${assets.length} assets with analysis column.`);
