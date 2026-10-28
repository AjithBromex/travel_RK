"use client";

import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TravelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-page p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-text-secondary font-medium mb-8 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-3 bg-page text-text-secondary border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-3 bg-travel text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-travel/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );
}
