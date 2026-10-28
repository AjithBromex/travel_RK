export default function TravelLoading() {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Header skeleton */}
      <div className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3">
        <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-2.5 w-14 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass p-6 rounded-3xl flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-200 rounded-2xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
