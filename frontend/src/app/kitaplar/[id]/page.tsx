import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionButton } from '@/components/action-button';
import { StockBadge } from '@/components/book-card';
import { FlashBanner } from '@/components/flash-banner';
import { ReviewForm } from '@/components/review-form';
import { ApiError } from '@/lib/api';
import { borrowAction, deleteReviewAction, reserveAction } from '@/lib/actions';
import { getBook, getBookReviews } from '@/lib/data';
import { authorNames, formatDate } from '@/lib/format';
import { getSessionUser } from '@/lib/session';
import type { Book, ReviewList } from '@/lib/types';

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { bilgi } = await searchParams;
  const bookId = Number(id);
  if (!Number.isInteger(bookId) || bookId < 1) notFound();

  let book: Book;
  let reviews: ReviewList;
  try {
    [book, reviews] = await Promise.all([getBook(bookId), getBookReviews(bookId)]);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const user = await getSessionUser();
  const inStock = book.availableCopies > 0;

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Katalog
      </Link>

      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <article className="space-y-4 rounded-lg border border-border bg-surface p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{book.title}</h1>
          <p className="text-muted">{authorNames(book.authors)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StockBadge available={book.availableCopies} />
          {book.categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${encodeURIComponent(category.slug)}`}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {book.description && <p className="leading-relaxed">{book.description}</p>}

        <dl className="grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted">Yayınevi</dt>
            <dd>{book.publisher.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Yayın yılı</dt>
            <dd>{book.publishedYear ?? 'Belirtilmemiş'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">ISBN</dt>
            <dd className="font-mono text-xs">{book.isbn ?? 'Belirtilmemiş'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Kopya</dt>
            <dd>
              {book.availableCopies} / {book.totalCopies} rafta
            </dd>
          </div>
        </dl>

        <div className="border-t border-border pt-4">
          {!user ? (
            <p className="text-sm text-muted">
              Ödünç almak veya rezerve etmek için{' '}
              <Link href="/giris" className="text-accent underline underline-offset-2">
                giriş yapın
              </Link>
              .
            </p>
          ) : inStock ? (
            <ActionButton
              action={borrowAction}
              fields={{ bookId: book.id }}
              label="Ödünç al"
              pendingLabel="Alınıyor…"
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                Tüm kopyalar ödünçte. Rezervasyon kuyruğuna girebilirsiniz.
              </p>
              <ActionButton
                action={reserveAction}
                fields={{ bookId: book.id }}
                label="Rezerve et"
                pendingLabel="Ekleniyor…"
                variant="secondary"
              />
            </div>
          )}
        </div>
      </article>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Yorumlar{' '}
            <span className="text-base font-normal text-muted">
              ({reviews.meta.total})
            </span>
          </h2>
          {reviews.meta.averageRating !== null && (
            <p className="text-sm text-muted">
              Ortalama puan{' '}
              <span className="font-medium text-foreground">
                {reviews.meta.averageRating.toFixed(2)}
              </span>{' '}
              / 5
            </p>
          )}
        </div>

        {user && <ReviewForm bookId={book.id} />}

        {reviews.data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Bu kitap için henüz yorum yok.
          </p>
        ) : (
          <ul className="space-y-3">
            {reviews.data.map((review) => {
              const isOwner = user?.id === review.user.id;
              const canDelete = isOwner || user?.roles.includes('ADMIN');

              return (
                <li
                  key={review.id}
                  className="space-y-2 rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">
                      {review.user.firstName} {review.user.lastName}
                    </span>
                    <span className="text-accent" aria-label={`${review.rating} / 5`}>
                      {'★'.repeat(review.rating)}
                      <span className="text-muted">{'☆'.repeat(5 - review.rating)}</span>
                    </span>
                    <span className="text-muted">{formatDate(review.createdAt)}</span>
                  </div>

                  {review.comment && (
                    <p className="text-sm leading-relaxed">{review.comment}</p>
                  )}

                  {canDelete && (
                    <ActionButton
                      action={deleteReviewAction}
                      fields={{ reviewId: review.id, bookId: book.id }}
                      label="Sil"
                      pendingLabel="Siliniyor…"
                      variant="danger"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
