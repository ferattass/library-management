import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActionButton } from '@/components/action-button';
import { FlashBanner } from '@/components/flash-banner';
import { cancelReservationAction, returnAction } from '@/lib/actions';
import { getMyBorrowings, getMyReservations } from '@/lib/data';
import {
  BORROWING_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  daysUntil,
  formatDate,
} from '@/lib/format';
import { getSessionUser } from '@/lib/session';

/** Vadeye kalan süreyi insan diline çevirir. */
function dueLabel(dueDate: string): { text: string; urgent: boolean } {
  const days = daysUntil(dueDate);
  if (days < 0) return { text: `${Math.abs(days)} gün gecikti`, urgent: true };
  if (days === 0) return { text: 'Bugün son gün', urgent: true };
  return { text: `${days} gün kaldı`, urgent: days <= 2 };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/giris');

  const { bilgi } = await searchParams;

  const [borrowings, reservations] = await Promise.all([
    getMyBorrowings(),
    getMyReservations(),
  ]);

  const active = borrowings?.data.filter((b) => b.status !== 'RETURNED') ?? [];
  const past = borrowings?.data.filter((b) => b.status === 'RETURNED') ?? [];
  const openReservations =
    reservations?.data.filter(
      (r) => r.status === 'PENDING' || r.status === 'READY',
    ) ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hesabım</h1>
        <p className="mt-1 text-sm text-muted">
          {user.firstName} {user.lastName} · {user.email}
        </p>
      </div>

      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Ödünçtekiler{' '}
          <span className="text-base font-normal text-muted">
            ({active.length} / 5)
          </span>
        </h2>

        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Şu anda ödünç aldığınız kitap yok.{' '}
            <Link href="/" className="text-accent underline underline-offset-2">
              Kataloga göz atın
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((borrowing) => {
              const due = dueLabel(borrowing.dueDate);
              return (
                <li
                  key={borrowing.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/kitaplar/${borrowing.book.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {borrowing.book.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatDate(borrowing.borrowedAt)} tarihinde alındı · son iade{' '}
                      {formatDate(borrowing.dueDate)}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        due.urgent ? 'text-red-600 dark:text-red-400' : 'text-muted'
                      }`}
                    >
                      {BORROWING_STATUS_LABEL[borrowing.status]} · {due.text}
                    </p>
                  </div>

                  <ActionButton
                    action={returnAction}
                    fields={{ borrowingId: borrowing.id }}
                    label="İade et"
                    pendingLabel="İade ediliyor…"
                    variant="secondary"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Rezervasyonlar{' '}
          <span className="text-base font-normal text-muted">
            ({openReservations.length})
          </span>
        </h2>

        {openReservations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Açık rezervasyonunuz yok.
          </p>
        ) : (
          <ul className="space-y-3">
            {openReservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <div className="space-y-1">
                  <Link
                    href={`/kitaplar/${reservation.book.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {reservation.book.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatDate(reservation.reservedAt)} tarihinde rezerve edildi
                  </p>
                  <p className="text-sm font-medium text-muted">
                    {RESERVATION_STATUS_LABEL[reservation.status]}
                    {reservation.status === 'PENDING' &&
                      ` · kuyrukta ${reservation.queuePosition}. sıradasınız`}
                    {reservation.status === 'READY' &&
                      reservation.readyUntil &&
                      ` · ${formatDate(reservation.readyUntil)} tarihine kadar teslim alın`}
                  </p>
                </div>

                <ActionButton
                  action={cancelReservationAction}
                  fields={{ reservationId: reservation.id }}
                  label="İptal et"
                  pendingLabel="İptal ediliyor…"
                  variant="danger"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Geçmiş</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {past.map((borrowing) => (
              <li
                key={borrowing.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <Link
                  href={`/kitaplar/${borrowing.book.id}`}
                  className="font-medium hover:text-accent"
                >
                  {borrowing.book.title}
                </Link>
                <span className="text-muted">
                  {borrowing.returnedAt
                    ? `${formatDate(borrowing.returnedAt)} tarihinde iade edildi`
                    : 'İade edildi'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
