import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { PRODUCTION_ASSESSMENT_CONTRACT_ID } from "@/lib/contracts/productionAssessment";

describe("GET /api/health", () => {
  it("reports the production-assessment capability and its contract id", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.capabilities.productionAssessment).toBe(true);
    expect(json.contracts).toContain(PRODUCTION_ASSESSMENT_CONTRACT_ID);
    expect(typeof json.assets.total).toBe("number");
  });
});
