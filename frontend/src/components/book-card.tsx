import Link from 'next/link';

import { authorNames } from '@/lib/format';
import type { Book } from '@/lib/types';

export function StockBadge({ available }: { available: number }) {
  if (available <= 0) {
    return (
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
        Rafta yok
      </span>
    );
  }
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
      {available} kopya rafta
    </span>
  );
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/kitaplar/${book.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition hover:border-accent"
    >
      <h2 className="font-semibold leading-snug">{book.title}</h2>
      <p className="text-sm text-muted">{authorNames(book.authors)}</p>
      <p className="text-sm text-muted">
        {book.publisher.name}
        {book.publishedYear ? ` · ${book.publishedYear}` : ''}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <StockBadge available={book.availableCopies} />
        {book.categories.map((category) => (
          <span
            key={category.id}
            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
          >
            {category.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
