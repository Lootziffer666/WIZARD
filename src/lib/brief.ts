import { searchLibrary, type LibraryAsset } from "./db";
import { deriveShadedPass, type ShadedPassResult } from "./shadedPass";
import { buildCapabilityCast, type CapabilityCastResult } from "./capabilities";
import { semanticSearch } from "./semantic";
import { memoryBoosts, type MemoryBoost } from "./memory";
import { deriveProvenance, type ProvenanceSource } from "./provenance";
import {
  buildSurfacePass,
  deriveCharacterPipeline,
  type SurfacePassResult,
  type CharacterPipelineResult,
} from "./epicPipeline";

export interface BriefResult {
  brief: string;
  broad: BriefAsset[];
  starterKit: Record<string, BriefAsset[]>;
  missingAssets: string[];
  totalFound: number;
  /** Weltkleber-Schritt (assetpilot.md): SHADED-Parameter + SWIFT-Weltzustände. */
  shadedPass: ShadedPassResult;
  /** Feature Casting (assetpilot.md): benötigte Fähigkeiten + gecastete Systeme. */
  capabilityCast: CapabilityCastResult;
  /** Megascans-Oberflächen passend zu den SHADED-Weltzuständen (Fotogrammetrie-Basis). */
  surfacePass: SurfacePassResult;
  /** Empfohlener Charakter-Weg: MetaHuman→SWIFT oder SWIFT-prozedural. */
  characterPipeline: CharacterPipelineResult;
}

export interface BriefAsset {
  id: string;
  title: string;
  category: string;
  platform: string;
  publisher: string;
  url: string;
  /** Quellen-Provenienz + Nutzungshinweis (assetpilot.md: Quellen unterscheiden). */
  source: ProvenanceSource;
  usage: string;
  /** Produktionsgedächtnis: belegte Bewährungen/Warnungen für diesen Kontext. */
  proven?: string[];
  warnings?: string[];
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

function summarize(a: LibraryAsset, memory?: Map<string, MemoryBoost>): BriefAsset {
  const prov = deriveProvenance(a);
  const asset: BriefAsset = {
    id: a.id,
    title: a.title,
    category: a.category,
    platform: a.platform,
    publisher: a.publisher,
    url: a.url,
    source: prov.source,
    usage: prov.usage,
  };
  const boost = memory?.get(a.id);
  if (boost?.proven.length) asset.proven = boost.proven;
  if (boost?.warnings.length) asset.warnings = boost.warnings;
  return asset;
}

/** Innerhalb einer Rolle: bewährte Assets nach vorn, problematische nach hinten. */
function rerankByMemory(hits: LibraryAsset[], memory: Map<string, MemoryBoost>): LibraryAsset[] {
  return [...hits].sort(
    (a, b) => (memory.get(b.id)?.boost ?? 0) - (memory.get(a.id)?.boost ?? 0)
  );
}

export async function buildProductionBrief(
  brief: string,
  maxPerRole = 4
): Promise<BriefResult> {
  const memory = await memoryBoosts(brief);

  // Breite Suche semantisch (Konzept-Expansion + Trigramm-Reranking) statt Roh-FTS
  const broadHits = await semanticSearch({ query: brief, limit: 12 });
  const broad = rerankByMemory(broadHits, memory).map((a) => summarize(a, memory));

  const starterKit: Record<string, BriefAsset[]> = {};
  const missingAssets: string[] = [];

  for (const r of ROLES) {
    let hits: LibraryAsset[] = [];
    for (const c of r.cats) {
      const res = await searchLibrary({ query: brief, category: c, limit: maxPerRole });
      hits = hits.concat(res);
      if (hits.length >= maxPerRole) break;
    }
    hits = rerankByMemory(hits.slice(0, maxPerRole), memory);
    const summarized = hits.map((h) => summarize(h, memory));
    starterKit[r.role] = summarized;
    if (summarized.length < 2) missingAssets.push(r.role);
  }

  const shadedPass = deriveShadedPass(brief);

  return {
    brief,
    broad,
    starterKit,
    missingAssets,
    totalFound: Object.values(starterKit).reduce((n, a) => n + a.length, 0),
    shadedPass,
    capabilityCast: await buildCapabilityCast(brief),
    surfacePass: await buildSurfacePass(shadedPass),
    characterPipeline: deriveCharacterPipeline(brief),
  };
}
