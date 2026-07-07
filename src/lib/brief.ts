import { searchLibrary, type LibraryAsset } from "./db";

export interface BriefResult {
  brief: string;
  broad: BriefAsset[];
  starterKit: Record<string, BriefAsset[]>;
  missingAssets: string[];
  totalFound: number;
}

export interface BriefAsset {
  id: string;
  title: string;
  category: string;
  platform: string;
  publisher: string;
  url: string;
}

const ROLES: { role: string; cats: string[] }[] = [
  { role: "Environment", cats: ["environments"] },
  { role: "Characters", cats: ["characters"] },
  { role: "Props", cats: ["props"] },
  { role: "Materials", cats: ["textures-materials"] },
  { role: "Audio", cats: ["audio", "sound-fx", "music"] },
  { role: "VFX", cats: ["vfx", "particles"] },
  { role: "UI", cats: ["gui"] },
];

function summarize(a: LibraryAsset): BriefAsset {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    platform: a.platform,
    publisher: a.publisher,
    url: a.url,
  };
}

export function buildProductionBrief(
  brief: string,
  maxPerRole = 4
): BriefResult {
  const broad = searchLibrary({ query: brief, limit: 12 }).map(summarize);

  const starterKit: Record<string, BriefAsset[]> = {};
  const missingAssets: string[] = [];

  for (const r of ROLES) {
    let hits: LibraryAsset[] = [];
    for (const c of r.cats) {
      const res = searchLibrary({ query: brief, category: c, limit: maxPerRole });
      hits = hits.concat(res);
      if (hits.length >= maxPerRole) break;
    }
    hits = hits.slice(0, maxPerRole).map((h) => h);
    const summarized = hits.map(summarize);
    starterKit[r.role] = summarized;
    if (summarized.length < 2) missingAssets.push(r.role);
  }

  return {
    brief,
    broad,
    starterKit,
    missingAssets,
    totalFound: Object.values(starterKit).reduce((n, a) => n + a.length, 0),
  };
}
