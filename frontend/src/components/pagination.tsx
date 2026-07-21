import Link from 'next/link';

import type { CatalogSearch } from '@/lib/data';
import type { PageMeta } from '@/lib/types';

function hrefFor(current: CatalogSearch, page: number): string {
  const params = new URLSearchParams();
  if (current.search) params.set('search', current.search);
  if (current.category) params.set('category', current.category);
  if (current.sortBy) params.set('sortBy', current.sortBy);
  if (current.sortOrder) params.set('sortOrder', current.sortOrder);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function Pagination({
  meta,
  current,
}: {
  meta: PageMeta;
  current: CatalogSearch;
}) {
  if (meta.totalPages <= 1) return null;

  const linkClass =
    'rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-muted';
  const disabledClass =
    'rounded-md border border-border px-3 py-2 text-sm opacity-40 cursor-not-allowed';

  return (
    <nav
      aria-label="Sayfalama"
      className="flex items-center justify-between gap-4 pt-2"
    >
      {meta.hasPrevious ? (
        <Link href={hrefFor(current, meta.page - 1)} className={linkClass} rel="prev">
          ← Önceki
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          ← Önceki
        </span>
      )}

      <span className="text-sm text-muted">
        Sayfa {meta.page} / {meta.totalPages} · toplam {meta.total} kitap
      </span>

      {meta.hasNext ? (
        <Link href={hrefFor(current, meta.page + 1)} className={linkClass} rel="next">
          Sonraki →
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Sonraki →
        </span>
      )}
    </nav>
  );
}
