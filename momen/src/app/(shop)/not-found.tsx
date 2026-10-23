import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card max-w-lg mx-auto mt-10 text-center space-y-3">
      <h1 className="h2">Not found</h1>
      <p className="text-sm text-muted">This page doesn&apos;t exist, or what it showed has been deleted. Deleted items can be restored from the Bin.</p>
      <div className="flex justify-center gap-2">
        <Link href="/bin" className="btn">Open the Bin</Link>
        <Link href="/" className="btn-primary">Go to Today</Link>
      </div>
    </div>
  );
}
