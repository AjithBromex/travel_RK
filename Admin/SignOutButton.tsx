'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => {
      setBusy(true);
      await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
      router.replace('/admin/login');
    }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
      <LogOut className="h-4 w-4" /> Sign out</button>
  );
}
