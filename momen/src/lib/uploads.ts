import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

// Photos go to a private Vercel Blob store when BLOB_READ_WRITE_TOKEN is set (production
// on Vercel), otherwise to a local folder. Either way they are only served through
// /api/photos/[name], which requires login.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function storePhoto(filename: string, data: Buffer, contentType: string): Promise<string | null> {
  if (blobEnabled()) {
    const blob = await put(`photos/${filename}`, data, { access: "private", contentType, addRandomSuffix: true });
    return blob.url;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), data);
  return null;
}

export async function loadPhoto(photo: { filename: string; url: string | null }): Promise<Uint8Array | null> {
  if (photo.url) {
    const res = await get(photo.url, { access: "private" });
    if (res?.statusCode !== 200) return null;
    return new Uint8Array(await new Response(res.stream).arrayBuffer());
  }
  try {
    return new Uint8Array(await readFile(path.join(UPLOAD_DIR, path.basename(photo.filename))));
  } catch {
    return null;
  }
}

export async function removePhoto(photo: { filename: string; url: string | null }) {
  if (photo.url) await del(photo.url).catch(() => {});
  else await unlink(path.join(UPLOAD_DIR, path.basename(photo.filename))).catch(() => {});
}
