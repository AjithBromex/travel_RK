'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
        router.replace('/admin/login');
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
      ) : (
        <LogOut className="h-3.5 w-3.5 text-slate-500" />
      )}
      <span>Sign out</span>
    </button>
  );
}
