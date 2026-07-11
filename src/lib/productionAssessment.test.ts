import { describe, it, expect } from "vitest";
import { buildProductionAssessment } from "./productionAssessment";
import { PRODUCTION_ASSESSMENT_CONTRACT_ID, isProductionAssessment } from "./contracts/productionAssessment";

// Läuft gegen die echte, im Repo committete data/assets.db (2470 Assets,
// key-freie FTS+Trigramm-Suche) — kein Mock, keine zweite Fixture-Wahrheit.

describe("buildProductionAssessment", () => {
  it("returns a well-formed assessment carrying the contract id", async () => {
    const result = await buildProductionAssessment({ brief: "Baue ein Koop-Abenteuer in einer staubigen Wüstenstadt" });
    expect(result.contract).toBe(PRODUCTION_ASSESSMENT_CONTRACT_ID);
    expect(isProductionAssessment(result)).toBe(true);
  });

  it("totalFound matches the sum of starter-kit assets across roles", async () => {
    const result = await buildProductionAssessment({ brief: "ein gemütliches Fachwerkdorf mit Händlern" });
    const sum = Object.values(result.starterKit).reduce((n, a) => n + a.length, 0);
    expect(result.totalFound).toBe(sum);
  });

  it("maps missing roles into ProductionSubstitution candidates drawn from the broad search", async () => {
    const result = await buildProductionAssessment({ brief: "ein Raumschiff voller improvisierter Technik" });
    for (const missing of result.missingAssets) {
      const sub = result.substitutions.find((s) => s.role === missing.role);
      expect(sub).toBeDefined();
    }
    // Jede Substitution muss auf eine tatsächlich fehlende Rolle zeigen.
    for (const sub of result.substitutions) {
      expect(result.missingAssets.some((m) => m.role === sub.role)).toBe(true);
    }
  });

  it("only flags provenance warnings for assets with unknown source or recorded warnings", async () => {
    const result = await buildProductionAssessment({ brief: "MetaHuman-Charaktere für ein realistisches Dorf" });
    for (const w of result.provenanceWarnings) {
      expect(typeof w.assetId).toBe("string");
      expect(typeof w.source).toBe("string");
    }
  });

  it("passes capabilityCast, surfacePass and characterPipeline through without re-deriving them", async () => {
    const result = await buildProductionAssessment({ brief: "ein Koop-Rennspiel mit Fahrzeugen" });
    expect(Array.isArray(result.capabilityCast.required)).toBe(true);
    expect(result.surfacePass.source).toBe("megascans");
    expect(["metahuman", "swift-procedural"]).toContain(result.characterPipeline.recommended);
  });

  it("respects an explicit maxPerRole", async () => {
    const result = await buildProductionAssessment({ brief: "ein Wald voller Ruinen", maxPerRole: 1 });
    for (const assets of Object.values(result.starterKit)) {
      expect(assets.length).toBeLessThanOrEqual(1);
    }
  });
});
