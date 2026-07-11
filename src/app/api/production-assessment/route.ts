import { NextRequest, NextResponse } from "next/server";
import { buildProductionAssessment } from "@/lib/productionAssessment";
import { isProductionAssessmentRequest } from "@/lib/contracts/productionAssessment";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isProductionAssessmentRequest(body)) {
    return NextResponse.json(
      {
        error:
          "Invalid request: 'brief' (non-empty string) is required; optional 'maxPerRole' must be a number between 1 and 20.",
      },
      { status: 400 }
    );
  }

  try {
    const assessment = await buildProductionAssessment(body);
    return NextResponse.json(assessment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/production-assessment]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
