// Route-level skeleton shown while a page's data loads
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-slate-200 mb-2" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-200 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
