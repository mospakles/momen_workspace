import { db } from "@/lib/db";
import { backupName, exportAll, loadBackup, saveBackupToBlob } from "@/lib/backup";
import { applyRecurring } from "@/lib/recurring";
import { purgeBin } from "@/lib/trash";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; the middleware lets only that through without a login. */
function isCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  // Daily cron: save a copy to the private Blob store, then the other nightly chores.
  if (isCronRequest(req)) {
    const backup = await saveBackupToBlob(db);
    await applyRecurring().catch((e) => console.error("recurring expenses failed", e));
    const purged = await purgeBin().catch((e) => (console.error("bin purge failed", e), 0));
    return Response.json({ backup, purged });
  }

  // Logged in: download a saved backup (?file=backups/...) or a fresh one.
  const file = new URL(req.url).searchParams.get("file");
  if (file) {
    const stream = await loadBackup(file);
    if (!stream) return new Response("Not found", { status: 404 });
    return new Response(stream, { headers: download(file.split("/").pop()!) });
  }
  const data = await exportAll(db);
  return new Response(JSON.stringify(data, null, 2), { headers: download(backupName(data.exportedAt)) });
}

function download(filename: string) {
  return { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" };
}
