import Link from 'next/link';

import { AdminTable } from '@/components/admin/field';
import { getAllBorrowings, getAllReservations, requireAdminToken } from '@/lib/admin-data';
import {
  BORROWING_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  daysUntil,
  formatDate,
} from '@/lib/format';

export default async function AdminBorrowingsPage() {
  const token = await requireAdminToken();
  const [borrowings, reservations] = await Promise.all([
    getAllBorrowings(token),
    getAllReservations(token),
  ]);

  const active = borrowings.data.filter((b) => b.status !== 'RETURNED');
  const overdue = active.filter((b) => daysUntil(b.dueDate) < 0);
  const openQueue = reservations.data.filter(
    (r) => r.status === 'PENDING' || r.status === 'READY',
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Ödünçte', value: active.length },
          { label: 'Gecikmiş', value: overdue.length, alert: overdue.length > 0 },
          { label: 'Açık rezervasyon', value: openQueue.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p
              className={`text-2xl font-semibold ${
                stat.alert ? 'text-red-600 dark:text-red-400' : ''
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Aktif ödünçler</h2>
        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Şu anda ödünçte kitap yok.
          </p>
        ) : (
          <AdminTable headers={['Kullanıcı', 'Kitap', 'Alındı', 'Son iade', 'Durum']}>
            {active.map((borrowing) => {
              const remaining = daysUntil(borrowing.dueDate);
              const late = remaining < 0;
              return (
                <tr key={borrowing.id}>
                  <td className="px-4 py-2">
                    {borrowing.user.firstName} {borrowing.user.lastName}
                    <span className="block text-xs text-muted">
                      {borrowing.user.email}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/kitaplar/${borrowing.book.id}`}
                      className="hover:text-accent"
                    >
                      {borrowing.book.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {formatDate(borrowing.borrowedAt)}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {formatDate(borrowing.dueDate)}
                  </td>
                  <td
                    className={`px-4 py-2 ${
                      late ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted'
                    }`}
                  >
                    {BORROWING_STATUS_LABEL[borrowing.status]}
                    {late
                      ? ` · ${Math.abs(remaining)} gün gecikti`
                      : ` · ${remaining} gün kaldı`}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Rezervasyon kuyrukları</h2>
        {openQueue.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Açık rezervasyon yok.
          </p>
        ) : (
          <AdminTable headers={['Kitap', 'Sıra', 'Kullanıcı', 'Durum']}>
            {openQueue.map((reservation) => (
              <tr key={reservation.id}>
                <td className="px-4 py-2">
                  <Link
                    href={`/kitaplar/${reservation.book.id}`}
                    className="hover:text-accent"
                  >
                    {reservation.book.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">{reservation.queuePosition}</td>
                <td className="px-4 py-2">
                  {reservation.user.firstName} {reservation.user.lastName}
                </td>
                <td className="px-4 py-2 text-muted">
                  {RESERVATION_STATUS_LABEL[reservation.status]}
                  {reservation.readyUntil &&
                    ` · ${formatDate(reservation.readyUntil)}'e kadar`}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>
    </div>
  );
}
