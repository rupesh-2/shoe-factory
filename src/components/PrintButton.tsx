"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-lg px-3.5 min-h-11 sm:min-h-9 text-sm font-medium transition-colors duration-200 bg-primary text-white hover:bg-primary-hover print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
