import { getDb } from "../src/lib/db";

const db = getDb();
const count = (db.prepare("SELECT COUNT(*) AS c FROM assets").get() as {
  c: number;
}).c;
const facets = (() => {
  const platforms = db
    .prepare("SELECT DISTINCT platform FROM assets ORDER BY platform")
    .all() as { platform: string }[];
  const categories = db
    .prepare("SELECT DISTINCT category FROM assets ORDER BY category")
    .all() as { category: string }[];
  return { platforms, categories: categories.length };
})();

console.log(`Database ready: ${count} assets`);
console.log(`Platforms: ${facets.platforms.map((p) => p.platform).join(", ")}`);
console.log(`Distinct categories: ${facets.categories}`);
