export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-56 animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
