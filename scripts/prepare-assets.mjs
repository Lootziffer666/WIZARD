import { createClient } from "@libsql/client";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const sourcePath = join(root, "src", "data", "assets.json");
const dbPath = join(root, "data", "assets.db");
const imageSourceDir = join(root, "data", "images");
const publicDir = join(root, "public");
const publicImageDir = join(publicDir, "catalog-images");
const catalogPath = join(publicDir, "catalog.json");

if (!existsSync(sourcePath)) {
  throw new Error(`Asset source not found: ${sourcePath}`);
}

mkdirSync(dirname(dbPath), { recursive: true });
mkdirSync(publicDir, { recursive: true });
rmSync(publicImageDir, { recursive: true, force: true });
mkdirSync(publicImageDir, { recursive: true });

const assets = JSON.parse(readFileSync(sourcePath, "utf8"));
if (!Array.isArray(assets)) {
  throw new Error("src/data/assets.json must contain an array");
}

function deriveType(category = "") {
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

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sniffExtension(path) {
  const buf = readFileSync(path);
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) return "webp";
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  return null;
}

// Keep the committed SQLite database useful for local development, but make
// assets.json the canonical source. Existing AI analysis is preserved by id.
const db = createClient({ url: `file:${dbPath}` });
await db.executeMultiple(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
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

const existingAnalysis = new Map();
const analysisRows = await db.execute(
  "SELECT id, analysis FROM assets WHERE analysis IS NOT NULL AND analysis != ''"
);
for (const row of analysisRows.rows) {
  existingAnalysis.set(String(row.id), String(row.analysis ?? ""));
}

await db.execute("DELETE FROM assets_fts");
await db.execute("DELETE FROM assets");

const statements = [];
for (const asset of assets) {
  const analysis =
    (typeof asset.analysis === "string" && asset.analysis.trim()) ||
    existingAnalysis.get(String(asset.id)) ||
    "";

  statements.push({
    sql: `INSERT INTO assets (id, title, category, publisher, platform, url, image, addedAt, analysis)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      String(asset.id),
      String(asset.title ?? ""),
      String(asset.category ?? ""),
      String(asset.publisher ?? ""),
      String(asset.platform ?? ""),
      String(asset.url ?? ""),
      String(asset.image ?? ""),
      Number(asset.addedAt ?? 0),
      analysis,
    ],
  });
  statements.push({
    sql: "INSERT INTO assets_fts (id, title, category, publisher, analysis) VALUES (?, ?, ?, ?, ?)",
    args: [
      String(asset.id),
      String(asset.title ?? ""),
      String(asset.category ?? ""),
      String(asset.publisher ?? ""),
      analysis,
    ],
  });
}

const BATCH_SIZE = 400;
for (let i = 0; i < statements.length; i += BATCH_SIZE) {
  await db.batch(statements.slice(i, i + BATCH_SIZE), "write");
}

db.close();

let copiedImages = 0;
const catalog = assets.map((asset) => {
  const id = String(asset.id);
  const localImage = join(imageSourceDir, `${id}.img`);
  let thumbnail = typeof asset.image === "string" ? asset.image : undefined;

  if (existsSync(localImage)) {
    const ext = sniffExtension(localImage);
    if (ext) {
      const fileName = `${safeFilePart(id)}.${ext}`;
      copyFileSync(localImage, join(publicImageDir, fileName));
      thumbnail = `/catalog-images/${fileName}`;
      copiedImages += 1;
    }
  }

  return {
    id,
    name: String(asset.title ?? ""),
    type: deriveType(String(asset.category ?? "")),
    path: String(asset.url ?? ""),
    tags: [
      ...String(asset.category ?? "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean),
      String(asset.publisher ?? ""),
    ].filter(Boolean),
    ...(thumbnail ? { thumbnail } : {}),
    description: `${String(asset.publisher ?? "")} · ${String(asset.category ?? "")} · ${String(asset.platform ?? "")}`,
  };
});

writeFileSync(catalogPath, JSON.stringify(catalog));
console.log(
  `[WIZARD] prepared ${catalog.length} assets, ${copiedImages} static previews, SQLite + FTS synchronized`
);
