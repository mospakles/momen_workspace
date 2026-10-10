"use client";

export function PrintButton() {
  return (
    <button className="btn btn-sm" onClick={() => window.print()}>
      Print / save PDF
    </button>
  );
}
