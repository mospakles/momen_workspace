"use client";

import Link from "next/link";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card max-w-lg mx-auto mt-10 text-center space-y-3">
      <h1 className="h2">Something went wrong</h1>
      <p className="text-sm text-muted">
        That didn&apos;t work, but nothing has been lost. Check what you typed and try again. If it keeps happening, it may be a bad internet connection.
      </p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <div className="flex justify-center gap-2">
        <button className="btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn">Go to Today</Link>
      </div>
    </div>
  );
}
