import Link from 'next/link';

import { ActionButton } from '@/components/action-button';
import { AdminForm } from '@/components/admin/admin-form';
import { AdminTable, Field, fieldClass } from '@/components/admin/field';
import { FlashBanner } from '@/components/flash-banner';
import { deletePublisherAction, savePublisherAction } from '@/lib/admin-actions';
import { getAdminPublishers } from '@/lib/admin-data';

export default async function AdminPublishersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { duzenle, bilgi } = await searchParams;
  const publishers = await getAdminPublishers();
  const editing = publishers.find((p) => String(p.id) === duzenle);

  return (
    <div className="space-y-6">
      <FlashBanner code={typeof bilgi === 'string' ? bilgi : undefined} />

      <AdminForm
        action={savePublisherAction}
        submitLabel={editing ? 'Güncelle' : 'Ekle'}
        editing={Boolean(editing)}
        cancelHref="/yonetim/yayinevleri"
        key={editing?.id ?? 'yeni'}
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <Field label="Ad">
          <input
            name="name"
            required
            minLength={2}
            maxLength={150}
            defaultValue={editing?.name ?? ''}
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Web sitesi" hint="https:// ile başlamalı">
            <input
              type="url"
              name="website"
              maxLength={255}
              placeholder="https://"
              defaultValue={editing?.website ?? ''}
              className={fieldClass}
            />
          </Field>
          <Field label="Adres" hint="İsteğe bağlı">
            <input
              name="address"
              maxLength={255}
              defaultValue={editing?.address ?? ''}
              className={fieldClass}
            />
          </Field>
        </div>
      </AdminForm>

      <AdminTable headers={['Ad', 'Web sitesi', 'Kitap', 'İşlem']}>
        {publishers.map((publisher) => (
          <tr key={publisher.id}>
            <td className="px-4 py-2">{publisher.name}</td>
            <td className="px-4 py-2 text-muted">{publisher.website ?? '—'}</td>
            <td className="px-4 py-2 text-muted">{publisher._count.books}</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/yonetim/yayinevleri?duzenle=${publisher.id}`}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                >
                  Düzenle
                </Link>
                <ActionButton
                  action={deletePublisherAction}
                  fields={{ id: publisher.id }}
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
