import { NextResponse } from "next/server";
import { getDbStats, countAnalyzed } from "@/lib/db";
import { PRODUCTION_ASSESSMENT_CONTRACT_ID } from "@/lib/contracts/productionAssessment";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getDbStats();
    const { total, analyzed } = await countAnalyzed();
    return NextResponse.json({
      status: "ok",
      ...stats,
      assets: { total, analyzed },
      capabilities: { productionAssessment: true },
      contracts: [PRODUCTION_ASSESSMENT_CONTRACT_ID],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}