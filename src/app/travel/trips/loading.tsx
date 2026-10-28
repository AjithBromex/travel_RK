export default function TravelSubLoading() {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3">
        <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-2.5 w-14 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-6 w-28 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface p-5 rounded-2xl border border-border space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
        <div className="h-14 w-full bg-slate-200 rounded-2xl animate-pulse" />
      </div>
      <div className="h-16 bg-surface border-t border-border" />
    </div>
  );
}
