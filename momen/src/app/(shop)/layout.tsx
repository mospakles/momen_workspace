import { Nav } from "@/components/Nav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-4 pt-4 pb-24 md:p-8 md:pb-8 max-w-6xl">{children}</main>
    </div>
  );
}
