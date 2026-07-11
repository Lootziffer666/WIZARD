/**
 * Epic-Ökosystem-Integration: Megascans + MetaHuman in der Produktionspipeline.
 *
 * - **Megascans-Surface-Pass**: SHADEDs Weltzustände (dust, aging, heat, …)
 *   werden auf Fotogrammetrie-Oberflächen abgebildet und direkt gegen die
 *   ~267 Quixel-Megascans-Einträge im Katalog gecastet. Ergebnis: konkrete
 *   Surfaces/Vegetation, die die vom SHADED-Pass beschriebene Weltstimmung
 *   physisch belegen (assetpilot.md: „Fotogrammetrie … kombiniert mit Shadern
 *   → realistischere Welt").
 *
 * - **Charakter-Pipeline**: Empfiehlt pro Spielidee den Charakter-Weg —
 *   MetaHuman (realistische Menschen: MetaHuman Creator → UE-FBX-Export →
 *   SWIFT-Sprite-Render) oder SWIFT-prozedural (stilisierte/Pixel-Figuren).
 *   Beide Wege enden in SHADEDs addActor() — MetaHuman wird dadurch zur
 *   FBX-Quelle für Sprite-Actors statt zur Engine-Abhängigkeit.
 */

import { semanticSearch } from "./semantic";
import type { ShadedPassResult } from "./shadedPass";
import type { BriefAsset } from "./brief";
import { deriveProvenance } from "./provenance";

const MEGASCANS_PUBLISHER = "Quixel";

/** Weltzustand → Fotogrammetrie-Oberflächen-Vokabular. `haze` ist reine
 *  Atmosphäre (SHADED-Sache) und bekommt bewusst keine Surface-Suche. */
const STATE_SURFACES: Record<string, string> = {
  dust: "sand desert dune dry rock cliff",
  sunbleach: "desert dry cliff bleached rock",
  aging: "ruin weathered old brick moss stone",
  humidity: "moss wet swamp mud forest",
  heat: "volcanic scorched lava rock ember",
  soot: "charred burnt charcoal ash",
};

/** Zusätzliche Surface-Hinweise aus den SHADED-Parametern selbst. */
const PARAM_SURFACES: { param: keyof ShadedPassResult["params"]; min: number; query: string }[] = [
  { param: "snow", min: 0.3, query: "snow ice frozen rock" },
  { param: "wet", min: 0.3, query: "wet mud puddle stone" },
  { param: "autumn", min: 0.3, query: "autumn leaves forest ground" },
];

export interface SurfacePassResult {
  source: "megascans";
  /** Weltzustand/Parameter → konkrete Katalog-Oberflächen. */
  suggestions: Record<string, BriefAsset[]>;
  note: string;
}

function toBriefAsset(a: {
  id: string;
  title: string;
  category: string;
  platform: string;
  publisher: string;
  url: string;
}): BriefAsset {
  const prov = deriveProvenance(a);
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    platform: a.platform,
    publisher: a.publisher,
    url: a.url,
    source: prov.source,
    usage: prov.usage,
  };
}

/** Castet Megascans-Oberflächen passend zu den SHADED-Weltzuständen. */
export async function buildSurfacePass(
  shadedPass: ShadedPassResult,
  maxPerState = 3
): Promise<SurfacePassResult> {
  const suggestions: Record<string, BriefAsset[]> = {};

  for (const ws of shadedPass.worldStates) {
    const query = STATE_SURFACES[ws.name];
    if (!query) continue;
    const hits = await semanticSearch({
      query,
      publisher: MEGASCANS_PUBLISHER,
      limit: maxPerState,
    });
    if (hits.length) suggestions[ws.name] = hits.map(toBriefAsset);
  }

  for (const rule of PARAM_SURFACES) {
    const v = shadedPass.params[rule.param];
    if (v == null || v < rule.min || suggestions[rule.param as string]) continue;
    const hits = await semanticSearch({
      query: rule.query,
      publisher: MEGASCANS_PUBLISHER,
      limit: maxPerState,
    });
    if (hits.length) suggestions[rule.param as string] = hits.map(toBriefAsset);
  }

  return {
    source: "megascans",
    suggestions,
    note:
      "Fotogrammetrie-Oberflächen (Quixel Megascans) passend zu den SHADED-Weltzuständen — SHADED legt Staub/Alterung/Nässe als Shader-Pass darüber, die Surfaces liefern die realistische Basis.",
  };
}

export interface CharacterPipelineResult {
  recommended: "metahuman" | "swift-procedural";
  reason: string;
  steps: string[];
}

const REALISTIC_RE =
  /realistisch|realistic|photoreal|fotoreal|mensch(en)?|human|metahuman|dorfbewohner|villager|bürger|crowd|passant/i;

/** Empfiehlt den Charakter-Produktionsweg für eine Spielidee. */
export function deriveCharacterPipeline(brief: string): CharacterPipelineResult {
  if (REALISTIC_RE.test(brief)) {
    return {
      recommended: "metahuman",
      reason:
        "Die Idee verlangt realistische/menschliche Figuren — MetaHuman liefert riggte, animierbare Menschen, SWIFT macht daraus SHADED-taugliche Sprite-Actors.",
      steps: [
        "MetaHuman im MetaHuman Creator gestalten und via Quixel Bridge in ein UE5-Projekt laden",
        "In UE5 als FBX exportieren (Skeletal Mesh + gewünschte Animation; LOD 2–4 reicht für Pixel-Art)",
        "SWIFT: python main.py render --model metahuman_hero.fbx --anim walk.fbx --format sprite_sheet --depth-pass --emissive-pass [--world-states dust,aging]",
        "SHADED: window.SHADED.addActor({ image, manifest, depthImage, emissiveImage, worldStateImages })",
        "CUE-AGENT: cue temporal-check / cue playable-check als Beweis-Gate",
      ],
    };
  }
  return {
    recommended: "swift-procedural",
    reason:
      "Stilisierte/Pixel-Figuren — SWIFTs prozeduraler Skelett-Generator bzw. FBX-Bibliothek (UAL/Mixamo) ist der direktere Weg, MetaHuman-Realismus ginge im Pixel-Look verloren.",
    steps: [
      "SWIFT: python main.py render --model character.fbx [--skeleton-generator --height-cm 170] --format sprite_sheet --depth-pass",
      "SHADED: window.SHADED.addActor({ image, manifest, depthImage })",
      "CUE-AGENT: cue temporal-check / cue playable-check als Beweis-Gate",
    ],
  };
}
