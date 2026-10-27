import type { Metadata } from "next";
import { db } from "@/lib/db";
import { whatsappLink } from "@/lib/format";
import { getBusiness } from "@/lib/settings";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getBusiness();
  return { title: `${name} · Portfolio`, description: `Outfits made by ${name}` };
}

// Public page: never show customer names, only the outfit and its caption.
export default async function PortfolioPage() {
  const photos = await db.photo.findMany({ where: { portfolio: true }, include: { order: { select: { title: true } } }, orderBy: { createdAt: "desc" } });
  const business = await getBusiness();
  const whatsapp = business.phone;
  const instagram = business.instagram;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/momen-logo.png" alt={business.name} className="h-12 w-auto mx-auto" />
        </h1>
        <p className="text-muted mt-1">Made-to-measure and ready-to-wear</p>
        <div className="flex justify-center gap-2 mt-4">
          {whatsapp && <a href={whatsappLink(whatsapp, "Hello! I saw your portfolio and I'd like to make an order.")} className="btn-primary">Order on WhatsApp</a>}
          {instagram && <a href={`https://instagram.com/${instagram.replace(/^@/, "")}`} className="btn">Instagram</a>}
        </div>
      </header>
      {photos.length === 0 ? (
        <p className="text-center text-muted">New work coming soon.</p>
      ) : (
        <div className="columns-2 md:columns-3 gap-3 [&>figure]:mb-3">
          {photos.map((p) => (
            <figure key={p.id} className="break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/portfolio/${p.filename}`} alt={p.caption ?? p.order.title} loading="lazy" className="w-full rounded-lg border border-line" />
              <figcaption className="text-sm mt-1">{p.caption ?? p.order.title}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
