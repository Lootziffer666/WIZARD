import {
  mkdirSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "data", "images");
mkdirSync(OUT, { recursive: true });

const assets = JSON.parse(readFileSync(join(ROOT, "src/data/assets.json"), "utf8"));

// Alle Assets mit gültiger Bild-URL (Fab + Unity).
const all = assets.filter(
  (a) => typeof a.image === "string" && a.image.startsWith("http")
);

const CONCURRENCY = 32;
let done = 0;
let ok = 0;
let fail = 0;
const start = Date.now();

async function downloadOne(a) {
  const file = join(OUT, `${a.id}.img`);
  if (existsSync(file)) {
    done++;
    ok++;
    return;
  }
  try {
    const res = await fetch(a.image, {
      headers: { "User-Agent": "Mozilla/5.0 AssetPilot" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error("too small");
    writeFileSync(file, buf);
    ok++;
  } catch {
    fail++;
  } finally {
    done++;
    if (done % 200 === 0) {
      const sec = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`[${done}/${all.length}] ok=${ok} fail=${fail} ${sec}s`);
    }
  }
}

async function run() {
  console.log(`Downloading ${all.length} preview images → ${OUT}`);
  let i = 0;
  const queue = all.slice();
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < queue.length) {
      const a = queue[i++];
      await downloadOne(a);
    }
  });
  await Promise.all(workers);
  console.log(`DONE ok=${ok} fail=${fail} total=${all.length}`);
}

run();
