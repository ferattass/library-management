/**
 * Kütüphane iş kuralı sabitleri.
 *
 * Şartnamede sayısal değer verilmediği için burada karara bağlandı;
 * gerekçeler docs/01-is-analizi.md §5'te.
 */

/** BR-03.5 — bir kullanıcının aynı anda tutabileceği en fazla ödünç sayısı. */
export const MAX_ACTIVE_BORROWINGS = 5;

/** BR-03.6 — ödünç süresi (gün). */
export const BORROW_PERIOD_DAYS = 14;

/** BR-04.5 — READY olan rezervasyonun alınma süresi (gün). */
export const RESERVATION_PICKUP_DAYS = 3;

export function addDays(from: Date, days: number): Date {
  const result = new Date(from);

  result.setDate(result.getDate() + days);

  return result;
}
