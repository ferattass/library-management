import Link from 'next/link';

import { ActionButton } from '@/components/action-button';
import { AdminForm } from '@/components/admin/admin-form';
import { AdminTable, Field, fieldClass } from '@/components/admin/field';
import { FlashBanner } from '@/components/flash-banner';
import { deleteBookAction, saveBookAction } from '@/lib/admin-actions';
import {
  getAdminAuthors,
  getAdminBooks,
  getAdminCategories,
  getAdminPublishers,
} from '@/lib/admin-data';
import { authorNames } from '@/lib/format';

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { duzenle, bilgi, page } = await searchParams;
  const pageNo = Number(typeof page === 'string' ? page : '1') || 1;

  const [books, authors, categories, publishers] = await Promise.all([
    getAdminBooks(pageNo),
    getAdminAuthors(),
    getAdminCategories(),
    getAdminPublishers(),
  ]);

  const editing = books.data.find((b) => String(b.id) === duzenle);
  const editingAuthorIds = new Set(editing?.authors.map((a) => a.id));
  const editingCategoryIds = new Set(editing?.categories.map((c) => c.id));

  return (
    <div className="space-y-6">
      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <AdminForm
        action={saveBookAction}
        submitLabel={editing ? 'Güncelle' : 'Ekle'}
        editing={Boolean(editing)}
        cancelHref="/yonetim/kitaplar"
        key={editing?.id ?? 'yeni'}
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <Field label="Başlık">
          <input
            name="title"
            required
            maxLength={255}
            defaultValue={editing?.title ?? ''}
            className={fieldClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="ISBN" hint="10 veya 13 hane, isteğe bağlı">
            <input
              name="isbn"
              maxLength={20}
              defaultValue={editing?.isbn ?? ''}
              className={fieldClass}
            />
          </Field>
          <Field label="Yayın yılı" hint="İsteğe bağlı">
            <input
              type="number"
              name="publishedYear"
              min={1000}
              max={2100}
              defaultValue={editing?.publishedYear ?? ''}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Toplam kopya"
            hint={
              editing
                ? `Şu an ${editing.availableCopies} rafta. Ödünçtekinin altına inilemez.`
                : undefined
            }
          >
            <input
              type="number"
              name="totalCopies"
              required
              min={0}
              max={100000}
              defaultValue={editing?.totalCopies ?? 1}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Yayınevi">
          <select
            name="publisherId"
            required
            defaultValue={editing?.publisher.id ?? ''}
            className={fieldClass}
          >
            <option value="" disabled>
              Seçiniz
            </option>
            {publishers.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Yazarlar" hint="Ctrl/Cmd ile birden fazla seçilebilir">
            <select
              name="authorIds"
              multiple
              required
              size={5}
              defaultValue={editing?.authors.map((a) => String(a.id)) ?? []}
              className={fieldClass}
            >
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.firstName} {author.lastName}
                  {editingAuthorIds.has(author.id) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategoriler" hint="Ctrl/Cmd ile birden fazla seçilebilir">
            <select
              name="categoryIds"
              multiple
              required
              size={5}
              defaultValue={editing?.categories.map((c) => String(c.id)) ?? []}
              className={fieldClass}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {editingCategoryIds.has(category.id) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Açıklama" hint="İsteğe bağlı">
          <textarea
            name="description"
            rows={3}
            maxLength={5000}
            defaultValue={editing?.description ?? ''}
            className={fieldClass}
          />
        </Field>
      </AdminForm>

      <AdminTable headers={['Başlık', 'Yazar', 'Yayınevi', 'Stok', 'İşlem']}>
        {books.data.map((book) => (
          <tr key={book.id}>
            <td className="px-4 py-2">
              <Link href={`/kitaplar/${book.id}`} className="hover:text-accent">
                {book.title}
              </Link>
            </td>
            <td className="px-4 py-2 text-muted">{authorNames(book.authors)}</td>
            <td className="px-4 py-2 text-muted">{book.publisher.name}</td>
            <td className="px-4 py-2 text-muted">
              {book.availableCopies} / {book.totalCopies}
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/yonetim/kitaplar?duzenle=${book.id}`}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                >
                  Düzenle
                </Link>
                <ActionButton
                  action={deleteBookAction}
                  fields={{ id: book.id }}
                  label="Sil"
                  pendingLabel="…"
                  variant="danger"
                />
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      {books.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {books.meta.hasPrevious ? (
            <Link
              href={`/yonetim/kitaplar?page=${books.meta.page - 1}`}
              className="rounded-md border border-border px-3 py-2 hover:bg-surface-muted"
            >
              ← Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Sayfa {books.meta.page} / {books.meta.totalPages} · {books.meta.total} kitap
          </span>
          {books.meta.hasNext ? (
            <Link
              href={`/yonetim/kitaplar?page=${books.meta.page + 1}`}
              className="rounded-md border border-border px-3 py-2 hover:bg-surface-muted"
            >
              Sonraki →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
