import Link from 'next/link';

import { ActionButton } from '@/components/action-button';
import { AdminForm } from '@/components/admin/admin-form';
import { AdminTable, Field, fieldClass } from '@/components/admin/field';
import { FlashBanner } from '@/components/flash-banner';
import { deleteCategoryAction, saveCategoryAction } from '@/lib/admin-actions';
import { getAdminCategories } from '@/lib/admin-data';

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { duzenle, bilgi } = await searchParams;
  const categories = await getAdminCategories();
  const editing = categories.find((c) => String(c.id) === duzenle);

  return (
    <div className="space-y-6">
      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <AdminForm
        action={saveCategoryAction}
        submitLabel={editing ? 'Güncelle' : 'Ekle'}
        editing={Boolean(editing)}
        cancelHref="/yonetim/kategoriler"
        key={editing?.id ?? 'yeni'}
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad">
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={editing?.name ?? ''}
              className={fieldClass}
            />
          </Field>
          <Field label="Slug" hint="Boş bırakılırsa addan üretilir">
            <input
              name="slug"
              maxLength={120}
              defaultValue={editing?.slug ?? ''}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field label="Açıklama" hint="İsteğe bağlı">
          <textarea
            name="description"
            rows={2}
            maxLength={2000}
            defaultValue={editing?.description ?? ''}
            className={fieldClass}
          />
        </Field>
      </AdminForm>

      <AdminTable headers={['Ad', 'Slug', 'Kitap', 'İşlem']}>
        {categories.map((category) => (
          <tr key={category.id}>
            <td className="px-4 py-2">{category.name}</td>
            <td className="px-4 py-2 font-mono text-xs text-muted">{category.slug}</td>
            <td className="px-4 py-2 text-muted">
              {category._count.bookCategories}
            </td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/yonetim/kategoriler?duzenle=${category.id}`}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                >
                  Düzenle
                </Link>
                <ActionButton
                  action={deleteCategoryAction}
                  fields={{ id: category.id }}
                  label="Sil"
                  pendingLabel="…"
                  variant="danger"
                />
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
