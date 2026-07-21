import Link from 'next/link';

import { SORT_OPTIONS, type CatalogSearch } from '@/lib/data';
import type { Category } from '@/lib/types';

/**
 * Düz bir GET formu — JavaScript olmadan da çalışır ve sonuç URL'de
 * taşındığı için filtreli bir sayfa paylaşılabilir/yer imlenebilir.
 * `page` bilinçli olarak taşınmıyor: filtre değişince 1'e dönmeli.
 */
export function CatalogFilters({
  categories,
  current,
}: {
  categories: Category[];
  current: CatalogSearch;
}) {
  return (
    <form
      method="get"
      action="/"
      className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="flex flex-col gap-1 text-sm lg:col-span-2">
        <span className="font-medium">Ara</span>
        <input
          type="search"
          name="search"
          defaultValue={current.search ?? ''}
          placeholder="Kitap adı veya yazar"
          maxLength={100}
          className="rounded-md border border-border bg-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Kategori</span>
        <select
          name="category"
          defaultValue={current.category ?? ''}
          className="rounded-md border border-border bg-background px-3 py-2"
        >
          <option value="">Tümü</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name} ({category._count.bookCategories})
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Sırala</span>
          <select
            name="sortBy"
            defaultValue={current.sortBy ?? 'title'}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Yön</span>
          <select
            name="sortOrder"
            defaultValue={current.sortOrder ?? 'asc'}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="asc">Artan</option>
            <option value="desc">Azalan</option>
          </select>
        </label>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:text-[#16140f]"
        >
          Uygula
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-muted"
        >
          Temizle
        </Link>
      </div>
    </form>
  );
}
