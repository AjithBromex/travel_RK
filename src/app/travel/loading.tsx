export default function TravelLoading() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top micro progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-slate-200 overflow-hidden">
        <div className="h-full bg-blue-600 w-1/3 animate-[shimmer_1.5s_infinite_linear]" 
          style={{
            animation: "progressPulse 1.2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Page Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-9 w-32 bg-slate-200/80 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stat Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3 bg-white/80">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="card p-6 bg-white/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse hidden sm:block" />
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse hidden md:block" />
              <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
