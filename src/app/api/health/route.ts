import { NextResponse } from "next/server";
import { getDbStats, countAnalyzed } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getDbStats();
    const { total, analyzed } = await countAnalyzed();
    return NextResponse.json({
      status: "ok",
      ...stats,
      assets: { total, analyzed },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}