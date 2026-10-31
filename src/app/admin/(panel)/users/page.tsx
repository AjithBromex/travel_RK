import { adminAuth } from "@/lib/firebaseAdmin";
import {
  deleteUser,
  forceSignOut,
  setUserDisabled,
} from "@/app/admin/actions";
import { Search, Shield, Ban, LogOut, Trash2 } from "lucide-react";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { users } = await adminAuth.listUsers(1000).catch(() => ({ users: [] }));
  const rows = users.filter((u) =>
    `${u.email} ${u.displayName ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Displaying {rows.length} of {users.length} registered accounts across the platform.
          </p>
        </div>

        <form className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search email or name..."
              className="rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-[#1558f0] focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#0f2f78] hover:bg-[#1558f0] px-4 py-2 text-sm font-semibold text-white transition-all shadow-sm cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(20,50,100,.06)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <tr>
              <th className="p-4">User</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Sign In</th>
              <th className="pr-4 text-right">Access Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => {
              const isAdmin = !!u.customClaims?.admin;
              return (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">
                      {u.displayName || u.email}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-bold text-[#1558f0]">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : u.disabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200/80 px-2.5 py-1 text-xs font-bold text-red-700">
                        <Ban className="w-3 h-3" /> Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="text-slate-600 text-xs font-mono">
                    {u.metadata.creationTime}
                  </td>
                  <td className="text-slate-600 text-xs font-mono">
                    {u.metadata.lastSignInTime ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {isAdmin ? (
                      <p className="text-right text-xs font-bold text-slate-400 italic">
                        Immutable (Protected)
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* Enable/Disable User */}
                        <form action={setUserDisabled}>
                          <input type="hidden" name="uid" value={u.uid} />
                          <input
                            type="hidden"
                            name="disabled"
                            value={String(!u.disabled)}
                          />
                          <button
                            type="submit"
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              u.disabled
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {u.disabled ? "Enable" : "Disable"}
                          </button>
                        </form>

                        {/* Force Sign Out */}
                        <form action={forceSignOut}>
                          <input type="hidden" name="uid" value={u.uid} />
                          <button
                            type="submit"
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                            title="Revoke refresh tokens and sign out user"
                          >
                            Sign out
                          </button>
                        </form>

                        {/* Delete User */}
                        <form action={deleteUser} className="flex items-center gap-1">
                          <input type="hidden" name="uid" value={u.uid} />
                          <input
                            name="confirm"
                            placeholder="type email to delete"
                            className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-red-400"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
