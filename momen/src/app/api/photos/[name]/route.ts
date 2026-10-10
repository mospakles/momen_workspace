import path from "node:path";
import { db } from "@/lib/db";
import { loadPhoto } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const filename = path.basename((await params).name);
  const photo = await db.photo.findFirst({ where: { filename } });
  const data = photo && (await loadPhoto(photo));
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data as BodyInit, {
    headers: {
      "Content-Type": TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
