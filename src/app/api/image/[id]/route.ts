import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LibraryAsset } from "@/lib/db";

export const runtime = "nodejs";

const IMAGES_DIR = process.env.IMAGES_DIR ?? join(process.cwd(), "data", "images");

function sniff(buf: Buffer): string {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.length > 12 && buf[0] === 0x52 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
    return "image/webp";
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
    return "image/gif";
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

  // Fallback: redirect to CDN URL stored in DB
  try {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const row = await db.execute({
      sql: "SELECT image FROM assets WHERE id = ?",
      args: [id],
    });
    const img = row.rows[0] as unknown as Pick<LibraryAsset, "image"> | undefined;
    if (img?.image) {
      return NextResponse.redirect(img.image, 307);
    }
  } catch {
    // DB not available
  }

  return new NextResponse("Not found", { status: 404 });
}
