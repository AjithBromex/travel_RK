import Link from 'next/link';
import { listRows } from '@/lib/admin/store';
import { inr } from '@/components/admin/Crud';

export const dynamic = 'force-dynamic';

const sum = (rows: Record<string, unknown>[], f: (r: Record<string, unknown>) => boolean = () => true) =>
  rows.filter(f).reduce((s, r) => s + Number(r.amount || 0), 0);

export default function Dashboard() {
  const trips = listRows('trips');
  const payments = listRows('payments');
  const expenses = listRows('expenses');
  const cash = listRows('cashbook');
  const reminders = listRows('reminders');
  const vehicles = listRows('vehicles');

  const received = sum(payments, (p) => p.status !== 'Pending');
  const spent = sum(expenses);
  const billed = sum(trips, (t) => t.status !== 'Cancelled');
  const balance = sum(cash, (c) => c.type === 'In') - sum(cash, (c) => c.type === 'Out');
  const today = new Date().toISOString().slice(0, 10);
  const due = reminders
    .filter((r) => r.status === 'Pending')
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 6);
  const live = trips.filter((t) => t.status === 'Ongoing' || t.status === 'Scheduled');

  return (
    <>
      <header className="page-head">
        <h1>Admin Operations Dashboard</h1>
      </header>

      <section className="ledger">
        <div>
          <span className="muted">Cash in hand</span>
          <strong>{inr(balance)}</strong>
        </div>
        <dl>
          <div>
            <dt>Billed (trips)</dt>
            <dd>{inr(billed)}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{inr(received)}</dd>
          </div>
          <div>
            <dt>To collect</dt>
            <dd>{inr(Math.max(billed - received, 0))}</dd>
          </div>
          <div>
            <dt>Expenses</dt>
            <dd>{inr(spent)}</dd>
          </div>
          <div>
            <dt>Profit so far</dt>
            <dd>{inr(received - spent)}</dd>
          </div>
        </dl>
      </section>

      <div className="two">
        <section>
          <h2>Reminders Due</h2>
          <ul className="list">
            {due.map((r) => (
              <li key={String(r.id)}>
                <span>{String(r.title)}</span>
                <span
                  className={
                    String(r.dueDate) < today ? 'badge bad' : 'badge warn'
                  }
                >
                  {String(r.dueDate) < today ? 'Overdue ' : ''}
                  {String(r.dueDate)}
                </span>
              </li>
            ))}
            {!due.length && <li className="muted">Nothing pending.</li>}
          </ul>
          <Link href="/admin/reminders" className="link">
            All reminders →
          </Link>
        </section>

        <section>
          <h2>Upcoming &amp; Ongoing Trips</h2>
          <ul className="list">
            {live.map((t) => (
              <li key={String(t.id)}>
                <span>
                  {String(t.from)} → {String(t.to)}
                  <small className="muted"> ({String(t.customer)})</small>
                </span>
                <span className="muted">{String(t.startDate)}</span>
              </li>
            ))}
            {!live.length && <li className="muted">No trips scheduled.</li>}
          </ul>
          <Link href="/admin/trips" className="link">
            All trips →
          </Link>
          <p className="foot">
            {vehicles.filter((v) => v.status === 'Available').length} of{' '}
            {vehicles.length} vehicles available
          </p>
        </section>
      </div>
    </>
  );
}
