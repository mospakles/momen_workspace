import path from "node:path";
import { db } from "@/lib/db";
import { loadPhoto } from "@/lib/uploads";

// Public, unlike /api/photos: serves a photo only if it was ticked "Show in portfolio".
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const filename = path.basename((await params).name);
  const photo = await db.photo.findFirst({ where: { filename, portfolio: true } });
  const data = photo && (await loadPhoto(photo));
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data as BodyInit, {
    headers: { "Content-Type": filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
