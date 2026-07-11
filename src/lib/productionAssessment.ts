/**
 * Baut den externen `anvil.wizard.production-assessment/v1`-Vertrag aus dem
 * bestehenden `buildProductionBrief()` (src/lib/brief.ts) — keine zweite
 * Auswahl-/Klassifikationslogik, nur Formung der bereits berechneten Wahrheit
 * in die stabile Vertragsform, die ANVIL konsumiert.
 */

import { buildProductionBrief, type BriefAsset } from "./brief";
import {
  PRODUCTION_ASSESSMENT_CONTRACT_ID,
  type ProductionAssessment,
  type ProductionAssessmentRequest,
  type StarterKitAsset,
  type ProvenanceWarning,
  type ProductionSubstitution,
} from "./contracts/productionAssessment";

function toStarterKitAsset(a: BriefAsset): StarterKitAsset {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    platform: a.platform,
    publisher: a.publisher,
    url: a.url,
    source: a.source,
    usage: a.usage,
    proven: a.proven,
    warnings: a.warnings,
  };
}

/** Assets mit ungeklärter Herkunft oder bekannten Problem-Notizen, dedupliziert nach id. */
function collectProvenanceWarnings(
  starterKit: Record<string, BriefAsset[]>,
  broad: BriefAsset[]
): ProvenanceWarning[] {
  const seen = new Map<string, ProvenanceWarning>();
  const all = [...broad, ...Object.values(starterKit).flat()];
  for (const a of all) {
    if (seen.has(a.id)) continue;
    const needsWarning = a.source === "unknown" || (a.warnings?.length ?? 0) > 0;
    if (!needsWarning) continue;
    seen.set(a.id, { assetId: a.id, source: a.source, usage: a.usage });
  }
  return [...seen.values()];
}

/** Für Rollen ohne ausreichende Abdeckung: Ersatzkandidaten aus der bereits
 *  berechneten breiten Suche (`broad`) — kein neuer Suchlauf. */
function buildSubstitutions(missingAssets: string[], broad: BriefAsset[]): ProductionSubstitution[] {
  if (missingAssets.length === 0 || broad.length === 0) return [];
  return missingAssets.map((role) => ({
    role,
    candidates: broad.slice(0, 2).map(toStarterKitAsset),
  }));
}

export async function buildProductionAssessment(
  request: ProductionAssessmentRequest
): Promise<ProductionAssessment> {
  const brief = await buildProductionBrief(request.brief, request.maxPerRole);

  const starterKit: Record<string, StarterKitAsset[]> = {};
  for (const [role, assets] of Object.entries(brief.starterKit)) {
    starterKit[role] = assets.map(toStarterKitAsset);
  }

  const surfaceSuggestions: Record<string, StarterKitAsset[]> = {};
  for (const [state, assets] of Object.entries(brief.surfacePass.suggestions)) {
    surfaceSuggestions[state] = assets.map(toStarterKitAsset);
  }

  return {
    contract: PRODUCTION_ASSESSMENT_CONTRACT_ID,
    brief: brief.brief,
    totalFound: brief.totalFound,
    starterKit,
    missingAssets: brief.missingAssets.map((role) => ({ role })),
    capabilityCast: brief.capabilityCast,
    surfacePass: { ...brief.surfacePass, suggestions: surfaceSuggestions },
    characterPipeline: brief.characterPipeline,
    provenanceWarnings: collectProvenanceWarnings(brief.starterKit, brief.broad),
    substitutions: buildSubstitutions(brief.missingAssets, brief.broad),
  };
}
