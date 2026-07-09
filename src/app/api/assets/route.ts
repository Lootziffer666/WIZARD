import { NextRequest, NextResponse } from "next/server";
import { getFacets, searchAssets, getDbStats } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "facets") {
      return NextResponse.json(getFacets());
    }

    if (action === "stats") {
      return NextResponse.json(getDbStats());
    }

    const assets = searchAssets({
      query: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      platform: searchParams.get("platform") ?? undefined,
      publisher: searchParams.get("publisher") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 200),
    });

    return NextResponse.json({ total: assets.length, assets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/assets]", msg);
    return NextResponse.json({ error: msg, total: 0, assets: [] }, { status: 500 });
  }
}