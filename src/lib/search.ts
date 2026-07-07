import type { Asset, Catalog, SearchParams } from "./types";

interface Scored {
  asset: Asset;
  score: number;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9äöü]+/i)
    .filter(Boolean);
}

export function searchAssets(catalog: Catalog, params: SearchParams): Asset[] {
  const { query = "", type = "", tags = [], maxPoly, limit = 50 } = params;

  const qTokens = tokenize(query);

  const scored: Scored[] = [];

  for (const asset of catalog) {
    if (type && asset.type !== type) continue;
    if (maxPoly != null && asset.polyCount != null && asset.polyCount > maxPoly)
      continue;
    if (tags.length > 0) {
      const hasAll = tags.every((t) =>
        asset.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())
      );
      if (!hasAll) continue;
    }

    let score = 0;
    if (qTokens.length > 0) {
      const haystack = tokenize(
        `${asset.name} ${asset.type} ${asset.tags.join(" ")} ${
          asset.description ?? ""
        }`
      );
      for (const qt of qTokens) {
        for (const h of haystack) {
          if (h === qt) score += 3;
          else if (h.includes(qt)) score += 1;
        }
      }
      if (score === 0) continue;
    } else {
      score = 1;
    }

    scored.push({ asset, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.asset);
}
