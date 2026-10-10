import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";

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
  const { name } = await params;
  const safe = path.basename(name); // block ../ traversal
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, safe));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
