"use client";

import { useRef, useState, useTransition } from "react";
import { PHOTO_KINDS } from "@/lib/constants";

const MAX_SIDE = 1600;

// Phone photos are often 3–8 MB, over Vercel's 4.5 MB request limit. Shrink them to
// ~1600px JPEGs in the browser first. Anything the browser can't decode is sent as-is.
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoUploadForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={form}
      className="grid sm:grid-cols-4 gap-2 no-print"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const source = new FormData(e.currentTarget);
        const fd = new FormData();
        for (const [k, v] of source) if (k !== "photos") fd.append(k, v);
        for (const f of source.getAll("photos")) if (f instanceof File && f.size) fd.append("photos", await shrink(f));
        startTransition(async () => {
          try {
            await action(fd);
            form.current?.reset();
          } catch {
            setError("Upload failed. Try fewer photos at a time.");
          }
        });
      }}
    >
      <input name="photos" type="file" accept="image/*" multiple className="input sm:col-span-2" required />
      <select name="kind" className="input" defaultValue="FITTING">
        {PHOTO_KINDS.map((k) => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>
      <input name="caption" placeholder="Caption" className="input" />
      <button className="btn-primary sm:col-span-4 sm:justify-self-start" disabled={pending}>
        {pending ? "Uploading…" : "Upload photos"}
      </button>
      {error && <p className="text-sm text-red-700 sm:col-span-4">{error}</p>}
    </form>
  );
}
