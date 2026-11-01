// In-memory store so the admin runs out of the box.
// It resets on restart/redeploy. To use your real database (Prisma, Mongo, Supabase...),
// reimplement these four functions – nothing else in the app needs to change.
import { SEED, MODULES } from './modules';

globalThis.__rkdb ||= structuredClone(SEED);
const db = () => globalThis.__rkdb;

export const listRows = (slug) => db()[slug];

export function clean(slug, body) {
  const out = {};
  for (const f of MODULES[slug].fields) {
    let v = body[f.key];
    if (f.type === 'number' || f.type === 'money') v = v === '' || v == null ? 0 : Number(v);
    else v = (v ?? '').toString().trim();
    if (f.required && (v === '' || Number.isNaN(v))) throw new Error(`${f.label} is required`);
    out[f.key] = v;
  }
  return out;
}

export function createRow(slug, body) {
  const row = { id: crypto.randomUUID(), ...clean(slug, body) };
  db()[slug].unshift(row);
  return row;
}

export function updateRow(slug, id, body) {
  const i = db()[slug].findIndex((r) => r.id === id);
  if (i < 0) return null;
  db()[slug][i] = { id, ...clean(slug, body) };
  return db()[slug][i];
}

export function deleteRow(slug, id) {
  const before = db()[slug].length;
  db()[slug] = db()[slug].filter((r) => r.id !== id);
  return db()[slug].length < before;
}
