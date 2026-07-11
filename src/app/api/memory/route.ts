import { NextRequest, NextResponse } from "next/server";
import { listMemory, recordMemory, type MemoryVerdict } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId") ?? undefined;
    const records = await listMemory(assetId);
    return NextResponse.json({ total: records.length, records });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/memory]", msg);
    return NextResponse.json({ error: msg, total: 0, records: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      assetId?: string;
      context?: string;
      verdict?: MemoryVerdict;
      combo?: Record<string, string>;
      note?: string;
    };
    if (!body.assetId || !body.context || !body.verdict) {
      return NextResponse.json(
        { error: "assetId, context und verdict (bewährt|problematisch) sind Pflicht." },
        { status: 400 }
      );
    }
    if (body.verdict !== "bewährt" && body.verdict !== "problematisch") {
      return NextResponse.json(
        { error: "verdict muss 'bewährt' oder 'problematisch' sein." },
        { status: 400 }
      );
    }
    const record = await recordMemory({
      assetId: body.assetId,
      context: body.context,
      verdict: body.verdict,
      combo: body.combo,
      note: body.note,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/memory]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
