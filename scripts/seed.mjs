import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DB_PATH = join(ROOT, "data", "assets.db");
const SEED_PATH = join(ROOT, "src", "data", "assets.json");

mkdirSync(join(ROOT, "data"), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
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
  CREATE INDEX IF NOT EXISTS idx_c ON assets(category);
  CREATE INDEX IF NOT EXISTS idx_p ON assets(platform);
  CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
    id UNINDEXED, title, category, publisher, analysis, tokenize='unicode61'
  );
`);

const count = db.prepare("SELECT COUNT(*) c FROM assets").get().c;
if (count > 0) {
  console.log(`DB already seeded (${count} assets).`);
  process.exit(0);
}

const assets = JSON.parse(readFileSync(SEED_PATH, "utf8"));
const insA = db.prepare(
  "INSERT OR REPLACE INTO assets (id,title,category,publisher,platform,url,image,addedAt,analysis) VALUES (?,?,?,?,?,?,?,?,?)"
);
const insF = db.prepare(
  "INSERT INTO assets_fts (id,title,category,publisher,analysis) VALUES (?,?,?,?,?)"
);
const tx = db.transaction((rows) => {
  for (const a of rows) {
    insA.run(a.id, a.title, a.category, a.publisher, a.platform, a.url, a.image, a.addedAt, "");
    insF.run(a.id, a.title, a.category, a.publisher, "");
  }
});
tx(assets);
console.log(`Seeded ${assets.length} assets with analysis column.`);
