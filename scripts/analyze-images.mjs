import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH ?? join(ROOT, "data", "assets.db");
const IMAGES_DIR = join(ROOT, "data", "images");

const MODE = process.argv.includes("--vision") ? "vision" : "heuristic";
const FORCE = process.argv.includes("--force");
const MODEL =
  process.env.ANALYSIS_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  "claude-haiku-4-5-20251001";

const db = createClient({ url: `file:${DB_PATH}` });
// Spalte ggf. nachrüsten (falls DB manuell ohne Schema angelegt wurde)
try {
  await db.execute("ALTER TABLE assets ADD COLUMN analysis TEXT");
} catch {
  /* existiert schon */
}

const rowsResult = await db.execute(
  "SELECT id, title, category, platform, image FROM assets"
);
const rows = rowsResult.rows;

// ---------- Heuristik (kein API-Key nötig) ----------
const CAT_WORDS = {
  "3d": "3d model",
  "2d": "2d",
  props: "prop object item",
  characters: "character creature",
  creatures: "creature monster beast",
  humanoids: "human humanoid character",
  animals: "animal",
  birds: "bird animal",
  robots: "robot mechanical",
  vehicles: "vehicle car",
  sea: "water vehicle boat",
  environments: "environment scene location",
  fantasy: "fantasy magical",
  urban: "urban city street building",
  "sci-fi": "scifi futuristic",
  sci: "scifi",
  landscapes: "landscape nature",
  dungeons: "dungeon dark underground",
  interior: "interior indoor room",
  exterior: "exterior outdoor",
  weapons: "weapon armament",
  vegetation: "vegetation plant foliage",
  trees: "tree",
  plants: "plant",
  "textures-materials": "texture material surface",
  brick: "brick",
  stone: "stone rock",
  metal: "metal",
  wood: "wood",
  fabric: "fabric cloth",
  concrete: "concrete",
  sand: "sand desert",
  water: "water",
  sky: "sky",
  nature: "nature",
  road: "road path",
  floor: "floor",
  "vfx": "vfx effect",
  particles: "particle effect",
  spells: "spell magic effect",
  shaders: "shader",
  "sound-fx": "audio sound sfx",
  audio: "audio sound",
  music: "music",
  tools: "tool utility",
  animation: "animation",
  modeling: "modeling",
  gui: "ui interface hud",
  integration: "integration plugin",
  "behavior-ai": "ai behavior",
  "input-management": "input control",
  "particles-effects": "particle effect",
  templates: "template system",
  systems: "system",
  essentials: "essential starter",
};

const TITLE_WORDS = {
  desert: "desert sand dry",
  dust: "dust dusty",
  ruin: "ruin abandoned broken",
  ruined: "ruin abandoned",
  horror: "horror scary dark",
  neon: "neon cyberpunk glowing",
  cyberpunk: "cyberpunk neon futuristic",
  cartoon: "cartoon stylized",
  stylized: "stylized",
  "low-poly": "lowpoly low polygon minimal",
  lowpoly: "lowpoly low polygon minimal",
  "low poly": "lowpoly low polygon minimal",
  realistic: "realistic",
  medieval: "medieval historical",
  futuristic: "futuristic scifi",
  fantasy: "fantasy magical",
  cute: "cute",
  sci: "scifi",
  military: "military",
  nature: "nature",
  urban: "urban city",
  forest: "forest nature",
  city: "city urban",
  village: "village rural",
  castle: "castle medieval",
  temple: "temple",
  cave: "cave underground",
  snow: "snow winter",
  ice: "ice cold",
  lava: "lava fire",
  fire: "fire",
  water: "water",
  weapon: "weapon",
  sword: "sword weapon",
  gun: "gun weapon",
  robot: "robot mechanical",
  zombie: "zombie horror undead",
  dragon: "dragon fantasy creature",
  tree: "tree nature",
  rock: "rock stone",
  house: "house building",
  building: "building urban",
  car: "car vehicle",
  ship: "ship boat vehicle",
  ui: "ui interface",
  hud: "hud ui",
  music: "music",
  sound: "sound audio",
  shader: "shader",
  particle: "particle effect",
  animation: "animation",
};

function heuristicTags(category, title) {
  const tags = new Set();
  for (const seg of String(category).toLowerCase().split("/")) {
    if (CAT_WORDS[seg]) tags.add(CAT_WORDS[seg]);
  }
  const t = String(title).toLowerCase();
  for (const [needle, words] of Object.entries(TITLE_WORDS)) {
    if (t.includes(needle)) tags.add(words);
  }
  return [...tags].join(" ").trim();
}

// ---------- Vision (Claude) ----------
let client = null;
if (MODE === "vision") {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("FEHLER: ANTHROPIC_API_KEY nicht gesetzt (Vision-Modus).");
    process.exit(1);
  }
  client = new Anthropic({ apiKey: key });
}

function magicType(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x52 && buf[8] === 0x57) return "image/webp";
  return "image/jpeg";
}

async function visionTags(id) {
  const file = join(IMAGES_DIR, `${id}.img`);
  if (!existsSync(file)) return "";
  const buf = readFileSync(file);
  const base64 = buf.toString("base64");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: magicType(buf),
              data: base64,
            },
          },
          {
            type: "text",
            text:
              "This is a game asset preview. Reply with ONLY lowercase English keywords (comma-separated, max 25) describing its VISUAL STYLE: genre, atmosphere, materials, color palette, era, theme, silhouette. No sentences. Example: fantasy, magical, stone, mossy, cool palette, medieval, detailed",
          },
        ],
      },
    ],
  });
  const txt = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .toLowerCase();
  return txt.replace(/\n/g, " ").replace(/[^a-z0-9, ]/g, "").trim();
}

// ---------- Loop ----------
let done = 0;
let changed = 0;
const start = Date.now();

async function processOne(row) {
  const existing = await db.execute({
    sql: "SELECT analysis FROM assets WHERE id = ?",
    args: [row.id],
  });
  if (!FORCE && existing.rows[0]?.analysis) {
    done++;
    return;
  }
  let tags = "";
  if (MODE === "vision") {
    tags = await visionTags(row.id);
  } else {
    tags = heuristicTags(row.category, row.title);
  }
  if (tags) {
    await db.batch(
      [
        { sql: "UPDATE assets SET analysis = ? WHERE id = ?", args: [tags, row.id] },
        { sql: "UPDATE assets_fts SET analysis = ? WHERE id = ?", args: [tags, row.id] },
      ],
      "write"
    );
    changed++;
  }
  done++;
  if (done % 200 === 0) {
    const sec = ((Date.now() - start) / 1000).toFixed(0);
    console.log(`[${done}/${rows.length}] mode=${MODE} changed=${changed} ${sec}s`);
  }
}

async function run() {
  console.log(
    `Mode=${MODE} model=${MODEL} assets=${rows.length} force=${FORCE}`
  );
  if (MODE === "vision") {
    const CONC = 8;
    let i = 0;
    const workers = Array.from({ length: CONC }, async () => {
      while (i < rows.length) {
        const row = rows[i++];
        await processOne(row);
      }
    });
    await Promise.all(workers);
  } else {
    for (const row of rows) await processOne(row);
  }
  console.log(`DONE mode=${MODE} changed=${changed}/${rows.length}`);
}

run();
