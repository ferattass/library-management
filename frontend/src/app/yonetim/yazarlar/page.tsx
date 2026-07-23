import Link from 'next/link';

import { ActionButton } from '@/components/action-button';
import { AdminForm } from '@/components/admin/admin-form';
import { AdminTable, Field, fieldClass } from '@/components/admin/field';
import { FlashBanner } from '@/components/flash-banner';
import { deleteAuthorAction, saveAuthorAction } from '@/lib/admin-actions';
import { getAdminAuthors } from '@/lib/admin-data';

export default async function AdminAuthorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { duzenle, bilgi } = await searchParams;
  const authors = await getAdminAuthors();
  const editing = authors.find((a) => String(a.id) === duzenle);

  return (
    <div className="space-y-6">
      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <AdminForm
        action={saveAuthorAction}
        submitLabel={editing ? 'Güncelle' : 'Ekle'}
        editing={Boolean(editing)}
        cancelHref="/yonetim/yazarlar"
        key={editing?.id ?? 'yeni'}
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad">
            <input
              name="firstName"
              required
              maxLength={100}
              defaultValue={editing?.firstName ?? ''}
              className={fieldClass}
            />
          </Field>
          <Field label="Soyad">
            <input
              name="lastName"
              required
              maxLength={100}
              defaultValue={editing?.lastName ?? ''}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field label="Doğum tarihi" hint="İsteğe bağlı">
          <input
            type="date"
            name="birthDate"
            defaultValue={editing?.birthDate?.slice(0, 10) ?? ''}
            className={fieldClass}
          />
        </Field>
        <Field label="Biyografi" hint="İsteğe bağlı">
          <textarea
            name="biography"
            rows={3}
            maxLength={5000}
            defaultValue={editing?.biography ?? ''}
            className={fieldClass}
          />
        </Field>
      </AdminForm>

      <AdminTable headers={['Ad Soyad', 'Kitap', 'İşlem']}>
        {authors.map((author) => (
          <tr key={author.id}>
            <td className="px-4 py-2">
              {author.firstName} {author.lastName}
            </td>
            <td className="px-4 py-2 text-muted">{author._count.bookAuthors}</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/yonetim/yazarlar?duzenle=${author.id}`}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                >
                  Düzenle
                </Link>
                <ActionButton
                  action={deleteAuthorAction}
                  fields={{ id: author.id }}
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
