import { describe, it, expect } from "vitest";
import {
  PRODUCTION_ASSESSMENT_CONTRACT_ID,
  isProductionAssessmentRequest,
  isProductionAssessment,
  type ProductionAssessment,
} from "./productionAssessment";

describe("PRODUCTION_ASSESSMENT_CONTRACT_ID", () => {
  it("is the versioned contract id WIZARD/ANVIL agree on", () => {
    expect(PRODUCTION_ASSESSMENT_CONTRACT_ID).toBe(
      "anvil.wizard.production-assessment/v1"
    );
  });
});

describe("isProductionAssessmentRequest", () => {
  it("accepts a minimal valid request", () => {
    expect(isProductionAssessmentRequest({ brief: "a desert coop game" })).toBe(true);
  });

  it("accepts an explicit maxPerRole within bounds", () => {
    expect(isProductionAssessmentRequest({ brief: "x", maxPerRole: 4 })).toBe(true);
  });

  it("rejects a missing brief", () => {
    expect(isProductionAssessmentRequest({})).toBe(false);
  });

  it("rejects an empty/whitespace-only brief", () => {
    expect(isProductionAssessmentRequest({ brief: "   " })).toBe(false);
  });

  it("rejects a non-string brief", () => {
    expect(isProductionAssessmentRequest({ brief: 123 })).toBe(false);
  });

  it("rejects a non-number maxPerRole", () => {
    expect(isProductionAssessmentRequest({ brief: "x", maxPerRole: "4" })).toBe(false);
  });

  it("rejects maxPerRole out of bounds", () => {
    expect(isProductionAssessmentRequest({ brief: "x", maxPerRole: 0 })).toBe(false);
    expect(isProductionAssessmentRequest({ brief: "x", maxPerRole: 21 })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isProductionAssessmentRequest(null)).toBe(false);
    expect(isProductionAssessmentRequest("brief")).toBe(false);
  });
});

describe("isProductionAssessment", () => {
  const valid: ProductionAssessment = {
    contract: PRODUCTION_ASSESSMENT_CONTRACT_ID,
    brief: "a desert coop game",
    totalFound: 3,
    starterKit: { Environment: [] },
    missingAssets: [{ role: "Audio" }],
    capabilityCast: { required: [], cast: {}, missingCapabilities: [] },
    surfacePass: { source: "megascans", suggestions: {}, note: "" },
    characterPipeline: { recommended: "swift-procedural", reason: "", steps: [] },
    provenanceWarnings: [],
    substitutions: [],
  };

  it("accepts a well-formed assessment", () => {
    expect(isProductionAssessment(valid)).toBe(true);
  });

  it("rejects a mismatched contract id", () => {
    expect(isProductionAssessment({ ...valid, contract: "anvil.wizard.production-assessment/v2" })).toBe(false);
  });

  it("rejects a missing missingAssets array", () => {
    const { missingAssets: _drop, ...rest } = valid;
    expect(isProductionAssessment(rest)).toBe(false);
  });
});
