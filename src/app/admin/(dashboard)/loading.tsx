export default function AdminLoading() {
  return (
    <div className="w-full animate-in fade-in duration-100 space-y-4">
      {/* Sleek top indeterminate progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="h-0.5 w-full bg-blue-600/20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 w-1/2 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Subtle skeleton structure matching admin cards */}
      <div className="w-full bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-40 bg-slate-200 rounded-lg" />
          <div className="h-8 w-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-9 w-full max-w-md bg-slate-100 rounded-xl" />
        <div className="space-y-2 pt-1">
          <div className="h-11 w-full bg-slate-100/80 rounded-xl" />
          <div className="h-11 w-full bg-slate-100/80 rounded-xl" />
          <div className="h-11 w-full bg-slate-100/80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
