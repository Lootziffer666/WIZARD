import type { Asset, AssetType, Catalog } from "./types";
import type { SearchParams } from "./db";

export interface LabAssetNeed {
  id: string;
  role: string;
  description: string;
  tags?: string[];
  preferredCategory?: string;
  acceptableRealizations?: string[];
}

export interface LabGeneratedArtifact {
  id: string;
  name: string;
  kind: "sprite_sheet" | "manifest" | "animation" | "audio" | "texture" | "depth_map" | "other";
  path: string;
  tags?: string[];
  description?: string;
}

export interface LabAssetBinding {
  needId: string;
  assetId?: string;
  artifactId?: string;
  route: "existing" | "generated" | "missing";
  confidence: "verified" | "strongly-inferred" | "ambiguous";
  notes?: string[];
}

const TYPE_BY_KIND: Record<LabGeneratedArtifact["kind"], AssetType> = {
  sprite_sheet: "Texture",
  manifest: "Other",
  animation: "Animation",
  audio: "Sound",
  texture: "Texture",
  depth_map: "Texture",
  other: "Other",
};

export function labNeedToSearchParams(need: LabAssetNeed, limit = 20): SearchParams {
  const terms = [need.role, need.description, ...(need.tags ?? [])]
    .map((term) => term.trim())
    .filter(Boolean);
  return {
    query: terms.join(" "),
    category: need.preferredCategory,
    limit,
    matchMode: "or",
  };
}

export function labArtifactToAsset(artifact: LabGeneratedArtifact): Asset {
  return {
    id: artifact.id,
    name: artifact.name,
    type: TYPE_BY_KIND[artifact.kind],
    path: artifact.path,
    tags: ["lab", "generated", artifact.kind, ...(artifact.tags ?? [])],
    description: artifact.description ?? `LAB generated ${artifact.kind}`,
  };
}

export function buildLabImportCatalog(artifacts: LabGeneratedArtifact[]): Catalog {
  return artifacts.map(labArtifactToAsset);
}

export function buildLabProductionContext(needs: LabAssetNeed[]): string {
  return needs
    .map((need) => {
      const acceptable = need.acceptableRealizations?.length
        ? ` Acceptable forms: ${need.acceptableRealizations.join(", ")}.`
        : "";
      return `[${need.id}] ${need.role}: ${need.description}.${acceptable}`;
    })
    .join("\n");
}
