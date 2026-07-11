import { NextRequest, NextResponse } from "next/server";
import { getFacets, searchAssets, getDbStats, toAsset } from "@/lib/db";
import { semanticSearch } from "@/lib/semantic";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "facets") {
      return NextResponse.json(await getFacets());
    }

    if (action === "stats") {
      return NextResponse.json(await getDbStats());
    }

    // ?semantic=1: Konzept-Expansion (de→en) + Trigramm-Reranking statt Roh-FTS
    if (searchParams.get("semantic") && searchParams.get("q")) {
      const hits = await semanticSearch({
        query: searchParams.get("q") ?? "",
        category: searchParams.get("category") ?? undefined,
        platform: searchParams.get("platform") ?? undefined,
        limit: Number(searchParams.get("limit") ?? 60),
      });
      return NextResponse.json({ total: hits.length, assets: hits.map(toAsset) });
    }

    const assets = await searchAssets({
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