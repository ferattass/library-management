import { BookCard } from '@/components/book-card';
import { CatalogFilters } from '@/components/catalog-filters';
import { Pagination } from '@/components/pagination';
import { getBooks, getCategories, type CatalogSearch } from '@/lib/data';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const first = (key: string): string | undefined => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const current: CatalogSearch = {
    page: first('page'),
    search: first('search'),
    category: first('category'),
    sortBy: first('sortBy'),
    sortOrder: first('sortOrder'),
  };

  const [books, categories] = await Promise.all([getBooks(current), getCategories()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Katalog</h1>
        <p className="mt-1 text-sm text-muted">
          Arama, kategori filtresi ve sıralama doğrudan API&apos;ye geçirilir.
        </p>
      </div>

      <CatalogFilters categories={categories} current={current} />

      {books.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted">
          Bu ölçütlere uyan kitap bulunamadı.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.data.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      <Pagination meta={books.meta} current={current} />
    </div>
  );
}
