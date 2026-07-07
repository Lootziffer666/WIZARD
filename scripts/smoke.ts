import { searchLibrary, getFacets } from "../src/lib/db";
const f = getFacets();
console.log("total:", f.total, "platforms:", f.platforms.join(","));
for (const q of ["wooden door", "tree", "water", "sci-fi city"]) {
  const r = searchLibrary({ query: q, limit: 2 });
  console.log(`\n"${q}" -> ${r.length}`);
  r.forEach((a: any) => console.log("  -", a.title, "|", a.category));
}
