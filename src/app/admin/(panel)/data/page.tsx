import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/adminSession";
import { deleteDocument } from "@/app/admin/actions";
import { Database, Trash2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const show = (v: any) =>
  v?.toDate
    ? v.toDate().toLocaleString("en-IN")
    : v && typeof v === "object"
    ? JSON.stringify(v)
    : String(v ?? "—");

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const col = COLLECTIONS.includes(c ?? "") ? c! : COLLECTIONS[0];
  const snap = await adminDb.collection(col).limit(50).get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Record<string, any>)
  );
  const keys = [
    ...new Set(docs.flatMap((d) => Object.keys(d)).filter((k) => k !== "id")),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          All Data Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing latest 50 records in collection “<span className="font-semibold text-slate-700">{col}</span>” across all user accounts.
        </p>
      </div>

      {/* Collection Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {COLLECTIONS.map((x) => (
          <Link
            key={x}
            href={`/admin/data?c=${x}`}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
              x === col
                ? "bg-[#0f2f78] text-white shadow-blue-900/20"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {x}
          </Link>
        ))}
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(20,50,100,.06)]">
        {docs.length === 0 ? (
          <p className="p-12 text-center text-sm text-slate-400">
            No records found in “{col}”.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="p-4">Doc ID</th>
                {keys.map((k) => (
                  <th key={k} className="pr-3">
                    {k}
                  </th>
                ))}
                <th className="pr-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono text-xs text-blue-600 font-semibold">
                    {d.id.slice(0, 10)}
                  </td>
                  {keys.map((k) => (
                    <td
                      key={k}
                      className="max-w-[200px] truncate pr-3 text-xs text-slate-600"
                    >
                      {show(d[k])}
                    </td>
                  ))}
                  <td className="pr-4 text-right">
                    <form action={deleteDocument}>
                      <input type="hidden" name="col" value={col} />
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-red-50 hover:bg-red-100 px-3 py-1 text-xs font-bold text-red-700 transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
