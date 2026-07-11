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

  let source: ProvenanceSource = "unknown";
  if (category.includes("device") || /fortnite.*device|device.*fortnite/.test(url)) {
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
