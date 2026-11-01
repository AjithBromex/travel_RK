'use client';
import { useMemo, useState } from 'react';

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const BADGE = { Active: 'ok', Paid: 'ok', Completed: 'ok', Available: 'ok', Done: 'ok', In: 'ok',
  Pending: 'warn', Partial: 'warn', Scheduled: 'warn', Maintenance: 'warn', 'On trip': 'warn', Ongoing: 'warn',
  Blocked: 'bad', Cancelled: 'bad', Out: 'bad' };

function Cell({ f, v }) {
  if (f.type === 'money') return inr(v);
  if (f.type === 'select' && v) return <span className={`badge ${BADGE[v] || ''}`}>{v}</span>;
  return v || <span className="muted">–</span>;
}

export default function Crud({ slug, title, singular, fields, columns, initial }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const cols = columns.map((k) => fields.find((f) => f.key === k));
  const shown = useMemo(() => rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === 'select' ? f.options[0] : '']));
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const edit = Boolean(form.id);
    const res = await fetch(`/api/${slug}${edit ? '/' + form.id : ''}`, {
      method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || 'Could not save');
    setRows(edit ? rows.map((r) => (r.id === data.id ? data : r)) : [data, ...rows]);
    setForm(null);
  }

  async function remove(r) {
    if (!confirm(`Delete this ${singular}?`)) return;
    const res = await fetch(`/api/${slug}/${r.id}`, { method: 'DELETE' });
    if (res.ok) setRows(rows.filter((x) => x.id !== r.id));
    else alert('Could not delete');
  }

  const moneyCol = fields.find((f) => f.type === 'money');
  const total = moneyCol ? shown.reduce((s, r) => s + Number(r[moneyCol.key] || 0), 0) : null;

  return (
    <>
      <header className="page-head">
        <h1>{title}</h1>
        <div className="tools">
          <input className="search" placeholder={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <button className="btn primary" onClick={() => { setErr(''); setForm(blank()); }}>Add {singular}</button>
        </div>
      </header>

      <div className="table-wrap">
        <table>
          <thead><tr>{cols.map((f) => <th key={f.key} className={f.type === 'money' ? 'r' : ''}>{f.label}</th>)}<th /></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                {cols.map((f) => <td key={f.key} className={f.type === 'money' ? 'r' : ''}><Cell f={f} v={r[f.key]} /></td>)}
                <td className="act">
                  <button className="link" onClick={() => { setErr(''); setForm({ ...r }); }}>Edit</button>
                  <button className="link danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={cols.length + 1} className="empty">{q ? 'No matches. Try a different search.' : `No ${title.toLowerCase()} yet. Add the first ${singular}.`}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted foot">{shown.length} records{total !== null && <> · Total {inr(total)}</>}</p>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? 'Edit' : 'Add'} {singular}</h2>
            <div className="grid">
              {fields.map((f) => (
                <label key={f.key} className={f.type === 'textarea' ? 'full' : ''}>{f.label}{f.required && ' *'}
                  {f.type === 'select' ? (
                    <select value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows={3} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                  ) : (
                    <input type={f.type === 'money' ? 'number' : f.type} step={f.type === 'money' ? '0.01' : undefined} min={f.type === 'money' || f.type === 'number' ? 0 : undefined}
                      value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                  )}
                </label>
              ))}
            </div>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
