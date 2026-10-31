import { adminDb } from "@/lib/firebaseAdmin";
import { ScrollText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditPage() {
  let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  try {
    const snap = await adminDb
      .collection("auditLogs")
      .orderBy("at", "desc")
      .limit(100)
      .get();
    docs = snap.docs;
  } catch (err) {
    console.warn("Could not retrieve auditLogs:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          System Audit Trail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Immutable log of administrative logins, token revocations, user modifications, and deletions.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(20,50,100,.06)]">
        {docs.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-bold text-slate-700">Audit Trail Clean</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign-ins and administrative changes will appear here automatically.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th>Admin / Actor</th>
                <th>Action</th>
                <th>Target Document / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => {
                const x = d.data();
                const isFail =
                  x.action?.includes("fail") || x.action?.includes("denied");
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500">
                      {x.at?.toDate?.().toLocaleString("en-IN") ?? "—"}
                    </td>
                    <td className="font-semibold text-slate-800 text-xs">
                      {x.actor}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isFail
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {x.action}
                      </span>
                    </td>
                    <td className="text-slate-600 text-xs font-mono">
                      {x.target || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
