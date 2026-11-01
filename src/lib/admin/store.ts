// In-memory store so the admin runs out of the box.
// It resets on restart/redeploy.
import { SEED, MODULES } from './modules';

declare global {
  // eslint-disable-next-line no-var
  var __rkdb: Record<string, Record<string, unknown>[]> | undefined;
}

const db = (): Record<string, Record<string, unknown>[]> => {
  if (!globalThis.__rkdb) {
    globalThis.__rkdb = JSON.parse(JSON.stringify(SEED));
  }
  return globalThis.__rkdb!;
};

export const listRows = (slug: string): Record<string, unknown>[] => {
  return db()[slug] || [];
};

export function clean(slug: string, body: Record<string, unknown>): Record<string, unknown> {
  const mod = MODULES[slug];
  if (!mod) throw new Error(`Unknown module: ${slug}`);
  const out: Record<string, unknown> = {};

  for (const f of mod.fields) {
    let v = body[f.key];
    if (f.type === 'number' || f.type === 'money') {
      v = v === '' || v == null ? 0 : Number(v);
    } else {
      v = (v ?? '').toString().trim();
    }
    if (f.required && (v === '' || Number.isNaN(v))) {
      throw new Error(`${f.label} is required`);
    }
    out[f.key] = v;
  }
  return out;
}

export function createRow(slug: string, body: Record<string, unknown>): Record<string, unknown> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const row = { id, ...clean(slug, body) };
  if (!db()[slug]) db()[slug] = [];
  db()[slug].unshift(row);
  return row;
}

export function updateRow(slug: string, id: string, body: Record<string, unknown>): Record<string, unknown> | null {
  if (!db()[slug]) return null;
  const i = db()[slug].findIndex((r) => r.id === id);
  if (i < 0) return null;
  db()[slug][i] = { id, ...clean(slug, body) };
  return db()[slug][i];
}

export function deleteRow(slug: string, id: string): boolean {
  if (!db()[slug]) return false;
  const before = db()[slug].length;
  db()[slug] = db()[slug].filter((r) => r.id !== id);
  return db()[slug].length < before;
}
