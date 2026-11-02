import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-150">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center text-blue-600 mb-3">
        <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
      </div>
      <p className="text-xs font-bold text-slate-700 tracking-tight">Loading records…</p>
      <p className="text-[11px] text-slate-400 mt-0.5">Synchronizing operational database</p>
    </div>
  );
}
