'use client';

import { useActionState } from 'react';

import { EMPTY_FORM_STATE, type FormState } from '@/lib/form-state';

import { FormAlert } from './form-alert';

type ServerAction = (state: FormState, formData: FormData) => Promise<FormState>;

interface ActionButtonProps {
  action: ServerAction;
  /** Gizli alan olarak gönderilecek değerler (ör. bookId). */
  fields: Record<string, string | number>;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  disabledReason?: string;
}

const VARIANTS = {
  primary: 'bg-accent text-white dark:text-[#16140f] hover:opacity-90',
  secondary: 'border border-border bg-surface hover:bg-surface-muted',
  danger:
    'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40',
} as const;

/**
 * Tek düğmelik mutasyonlar için (ödünç al, iade et, iptal et, sil).
 * Sunucu eylemi bir prop olarak geliyor — token istemciye hiç inmiyor.
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  variant = 'primary',
  disabled = false,
  disabledReason,
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <button
        type="submit"
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`}
      >
        {pending ? (pendingLabel ?? 'İşleniyor…') : label}
      </button>
      <FormAlert state={state} />
    </form>
  );
}
