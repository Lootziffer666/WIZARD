import { NextRequest, NextResponse } from "next/server";
import { getFacets, searchAssets } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "facets") {
    return NextResponse.json(getFacets());
  }

  const assets = searchAssets({
    query: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    platform: searchParams.get("platform") ?? undefined,
    publisher: searchParams.get("publisher") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 200),
  });

  return NextResponse.json({
    total: assets.length,
    assets,
  });
}
