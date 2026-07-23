'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { EMPTY_FORM_STATE, type FormState } from '@/lib/form-state';

import { FormAlert } from '../form-alert';

type ServerAction = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Yönetim formlarının ortak kabuğu. Alanlar `children` olarak sunucu
 * bileşeninden gelir; burada yalnızca gönderim durumu ve hata gösterimi var.
 */
export function AdminForm({
  action,
  children,
  submitLabel,
  editing = false,
  cancelHref,
}: {
  action: ServerAction;
  children: React.ReactNode;
  submitLabel: string;
  editing?: boolean;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="font-medium">{editing ? 'Kaydı düzenle' : 'Yeni kayıt'}</h2>
      <FormAlert state={state} />
      {children}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:text-[#16140f]"
        >
          {pending ? 'Kaydediliyor…' : submitLabel}
        </button>
        {editing && (
          <Link
            href={cancelHref}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-muted"
          >
            Vazgeç
          </Link>
        )}
      </div>
    </form>
  );
}
