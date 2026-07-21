import type { BorrowingStatus, ReservationStatus } from './types';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function authorNames(
  authors: { firstName: string; lastName: string }[],
): string {
  if (authors.length === 0) return 'Yazar belirtilmemiş';
  return authors.map((a) => `${a.firstName} ${a.lastName}`).join(', ');
}

/** Vadesine kalan gün; negatif ise gecikmiş. */
export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export const BORROWING_STATUS_LABEL: Record<BorrowingStatus, string> = {
  BORROWED: 'Ödünçte',
  RETURNED: 'İade edildi',
  LATE: 'Gecikmiş',
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Sırada',
  READY: 'Teslime hazır',
  FULFILLED: 'Karşılandı',
  CANCELLED: 'İptal edildi',
  EXPIRED: 'Süresi doldu',
};
