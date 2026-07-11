/**
 * Externer Vertrag: WIZARD → ANVIL (und darüber an GAMEPLAY/SCENE/INTERFACE/
 * ACOUSTIC/TARGET). WIZARD ist alleiniger Owner/Producer dieses Vertrags —
 * die Produktions-Auswahl (welche Assets, welche Fähigkeiten, welcher
 * Charakterweg) entsteht ausschließlich in WIZARD; ANVIL konsumiert das
 * Ergebnis unverändert und interpretiert es nicht neu.
 *
 * `PRODUCTION_ASSESSMENT_CONTRACT_ID` ist Vertragsbestandteil: ändert sich die
 * Form inkompatibel, muss die Versionsnummer steigen (`/v2`), nie in-place
 * brechen.
 */

export const PRODUCTION_ASSESSMENT_CONTRACT_ID =
  "anvil.wizard.production-assessment/v1";

export interface ProductionAssessmentRequest {
  /** Freitext-Spielidee, wie sie WIZARDs Chat/Brief-Flow entgegennimmt. */
  brief: string;
  /** Max. Assets pro Rolle im Starter-Kit (Default in productionAssessment.ts). */
  maxPerRole?: number;
}

export interface StarterKitAsset {
  id: string;
  title: string;
  category: string;
  platform: string;
  publisher: string;
  url: string;
  source: string;
  usage: string;
  proven?: string[];
  warnings?: string[];
}

/** Starter-Kit je Produktionsrolle (Environment, Characters, Props, …). */
export type StarterKit = Record<string, StarterKitAsset[]>;

export interface MissingAsset {
  /** Rolle, für die das Starter-Kit keine ausreichende Abdeckung fand. */
  role: string;
}

export interface MissingCapability {
  id: string;
  label: string;
}

export interface ProductionSubstitution {
  /** Rolle ohne ausreichende Starter-Kit-Abdeckung. */
  role: string;
  /** Ersatzkandidaten aus der breiten Katalogsuche (kein neuer Suchlauf, keine
   *  zweite Auswahl-Wahrheit — dieselben `broad`-Treffer wie im Brief). */
  candidates: StarterKitAsset[];
}

export interface CapabilityCast {
  required: { id: string; label: string; why: string }[];
  cast: Record<string, { id: string; title: string; category: string; url: string }[]>;
  missingCapabilities: MissingCapability[];
}

export interface SurfacePass {
  source: "megascans";
  suggestions: Record<string, StarterKitAsset[]>;
  note: string;
}

export interface CharacterPipeline {
  recommended: "metahuman" | "swift-procedural";
  reason: string;
  steps: string[];
}

export interface ProvenanceWarning {
  assetId: string;
  source: string;
  usage: string;
}

export interface ProductionAssessment {
  contract: typeof PRODUCTION_ASSESSMENT_CONTRACT_ID;
  brief: string;
  totalFound: number;
  starterKit: StarterKit;
  missingAssets: MissingAsset[];
  capabilityCast: CapabilityCast;
  surfacePass: SurfacePass;
  characterPipeline: CharacterPipeline;
  /** Nur Assets mit tatsächlichem Klärungsbedarf (source "unknown" oder mit warnings). */
  provenanceWarnings: ProvenanceWarning[];
  substitutions: ProductionSubstitution[];
}

/** Laufzeit-Validierung für eingehende HTTP-Bodies (JSON hat keine Typen). */
export function isProductionAssessmentRequest(
  v: unknown
): v is ProductionAssessmentRequest {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.brief !== "string" || r.brief.trim().length === 0) return false;
  if (r.maxPerRole !== undefined) {
    if (typeof r.maxPerRole !== "number" || !Number.isFinite(r.maxPerRole)) return false;
    if (r.maxPerRole < 1 || r.maxPerRole > 20) return false;
  }
  return true;
}

/** Minimale Struktur-Prüfung eines ProductionAssessment (für Konsumenten-Tests). */
export function isProductionAssessment(v: unknown): v is ProductionAssessment {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (r.contract !== PRODUCTION_ASSESSMENT_CONTRACT_ID) return false;
  if (typeof r.brief !== "string") return false;
  if (typeof r.totalFound !== "number") return false;
  if (typeof r.starterKit !== "object" || r.starterKit === null) return false;
  if (!Array.isArray(r.missingAssets)) return false;
  if (!Array.isArray(r.substitutions)) return false;
  if (!Array.isArray(r.provenanceWarnings)) return false;
  if (typeof r.capabilityCast !== "object" || r.capabilityCast === null) return false;
  if (typeof r.surfacePass !== "object" || r.surfacePass === null) return false;
  if (typeof r.characterPipeline !== "object" || r.characterPipeline === null) return false;
  return true;
}
