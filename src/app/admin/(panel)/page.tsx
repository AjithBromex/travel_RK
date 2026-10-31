import { AggregateField } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/adminSession";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

async function count(c: string) {
  try {
    return (await adminDb.collection(c).count().get()).data().count;
  } catch {
    return 0;
  }
}

async function sum(c: string, field = "amount") {
  try {
    return (
      (
        await adminDb
          .collection(c)
          .aggregate({ t: AggregateField.sum(field) })
          .get()
      ).data().t ?? 0
    );
  } catch {
    return 0;
  }
}

export default async function AdminOverviewPage() {
  const [users, counts, collection, expenses] = await Promise.all([
    adminAuth.listUsers(1000).catch(() => ({ users: [] })),
    Promise.all(COLLECTIONS.map(count)),
    sum("payments"),
    sum("expenses"),
  ]);

  const disabled = users.users.filter((u) => u.disabled).length;

  const cards: [string, string][] = [
    ["Total users", String(users.users.length)],
    ["Disabled users", String(disabled)],
    ["Collection (all users)", inr(collection)],
    ["Expenses (all users)", inr(expenses)],
    ["Net profit", inr(collection - expenses)],
    ...COLLECTIONS.map(
      (c, i): [string, string] => [
        c[0].toUpperCase() + c.slice(1),
        String(counts[i]),
      ]
    ),
  ];

  const recent = [...users.users]
    .sort(
      (a, b) =>
        +new Date(b.metadata.creationTime) - +new Date(a.metadata.creationTime)
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Admin Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Global analytics, ledger aggregates, and fleet data across all system users.
        </p>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div
            key={l}
            className="rounded-2xl bg-white p-5 border border-slate-100 shadow-[0_10px_30px_rgba(20,50,100,.06)] hover:border-blue-100 transition-all"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {l}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {v}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <section className="rounded-2xl bg-white p-6 border border-slate-100 shadow-[0_10px_30px_rgba(20,50,100,.06)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Recent User Accounts
          </h2>
          <span className="text-xs text-slate-400 font-semibold">
            Latest 5 registrations
          </span>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No registered users found yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((u) => {
              const isAdmin = !!u.customClaims?.admin;
              return (
                <li
                  key={u.uid}
                  className="flex items-center justify-between py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                      {(u.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {u.displayName || u.email}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <span className="rounded-full bg-blue-50 text-[#1558f0] px-2.5 py-0.5 text-xs font-bold">
                        Admin
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(u.metadata.creationTime).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
