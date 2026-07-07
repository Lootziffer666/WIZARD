import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const IMAGES_DIR = join(process.cwd(), "data", "images");

function sniff(buf: Buffer): string {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length > 4 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length > 12 &&
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const local = join(IMAGES_DIR, `${id}.img`);

  if (existsSync(local)) {
    const buf = readFileSync(local);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": sniff(buf),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const row = getDb()
    .prepare("SELECT image FROM assets WHERE id = ?")
    .get(id) as { image: string } | undefined;
  if (row?.image) {
    return NextResponse.redirect(row.image, 307);
  }
  return new NextResponse("Not found", { status: 404 });
}
