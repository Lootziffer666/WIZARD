/**
 * Quellen-Provenienz (assetpilot.md: „Asset Pilot sollte Quellen unterscheiden:
 * Fab, UEFN, LEGO, Star Wars, Fortnite Devices, Eigene Assets").
 *
 * Die Quelle wird deterministisch aus platform/url/category abgeleitet — keine
 * Schemaänderung nötig, funktioniert für den kompletten Bestandskatalog.
 * `usage` ist ein kurzer Nutzungs-/Lizenzhinweis für Produktionsentscheidungen
 * (welche Assets dürfen wohin?), kein Rechtsrat.
 */

export type ProvenanceSource =
  | "unity-store"
  | "fab"
  | "megascans"
  | "metahuman"
  | "uefn"
  | "fortnite-device"
  | "custom"
  | "unknown";

export interface Provenance {
  source: ProvenanceSource;
  /** Kurzer Nutzungshinweis (Deutsch), z. B. für den Production-Brief. */
  usage: string;
}

const USAGE: Record<ProvenanceSource, string> = {
  "unity-store":
    "Unity Asset Store EULA — Nutzung in eigenen Projekten, kein Weiterverkauf als Asset; UEFN-Import nicht automatisch erlaubt.",
  fab: "Fab-Standardlizenz — in UE/UEFN-Projekten nutzbar; Lizenzstufe (Personal/Pro) am Asset prüfen.",
  megascans:
    "Quixel Megascans (Fotogrammetrie, via Fab) — realistische Oberflächen/Vegetation; Lizenzstufe am Asset prüfen; ideal als SHADED-taugliche Referenz-/Szenenbasis.",
  metahuman:
    "MetaHuman (Epic) — nur in Unreal-Engine-Produkten nutzbar; als FBX-Export tauglicher SWIFT-Input für Sprite-Actors (siehe SWIFT docs/METAHUMAN.md).",
  uefn: "UEFN-Inhalt — nur innerhalb von Fortnite/UEFN-Inseln nutzbar, nicht exportierbar.",
  "fortnite-device":
    "Fortnite-Device — Gameplay-Baustein nur in UEFN; zählt als Fähigkeit, nicht als Mesh.",
  custom: "Eigenes Asset (z. B. Fotogrammetrie/SWIFT) — frei kombinierbar, volle Rechte.",
  unknown: "Quelle unklar — vor Produktionseinsatz Herkunft und Lizenz klären.",
};

export function deriveProvenance(asset: {
  platform?: string;
  url?: string;
  category?: string;
  publisher?: string;
}): Provenance {
  const url = (asset.url ?? "").toLowerCase();
  const platform = (asset.platform ?? "").toLowerCase();
  const category = (asset.category ?? "").toLowerCase();
  const publisher = (asset.publisher ?? "").toLowerCase();

  let source: ProvenanceSource = "unknown";
  if (publisher.includes("metahuman") || url.includes("metahuman")) {
    source = "metahuman";
  } else if (publisher.includes("quixel") || publisher.includes("megascan")) {
    source = "megascans";
  } else if (category.includes("device") || /fortnite.*device|device.*fortnite/.test(url)) {
    source = "fortnite-device";
  } else if (platform === "uefn" || url.includes("uefn")) {
    source = "uefn";
  } else if (platform === "unity" || url.includes("assetstore.unity.com")) {
    source = "unity-store";
  } else if (platform === "fab" || url.includes("fab.com")) {
    source = "fab";
  } else if (platform === "custom" || (!url.startsWith("http") && url.length > 0)) {
    source = "custom";
  }

  return { source, usage: USAGE[source] };
}
