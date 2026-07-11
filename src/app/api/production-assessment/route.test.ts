import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { PRODUCTION_ASSESSMENT_CONTRACT_ID } from "@/lib/contracts/productionAssessment";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/production-assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/production-assessment", () => {
  it("returns a real production assessment for a valid brief", async () => {
    const res = await POST(postRequest({ brief: "ein Koop-Abenteuer im Fachwerkdorf" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contract).toBe(PRODUCTION_ASSESSMENT_CONTRACT_ID);
    expect(typeof json.totalFound).toBe("number");
  });

  it("rejects a missing brief with 400", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/brief/);
  });

  it("rejects an out-of-bounds maxPerRole with 400", async () => {
    const res = await POST(postRequest({ brief: "x", maxPerRole: 999 }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new NextRequest("http://localhost/api/production-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
