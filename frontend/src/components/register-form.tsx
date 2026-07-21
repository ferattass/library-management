'use client';

import { useActionState } from 'react';

import { registerAction } from '@/lib/actions';
import { EMPTY_FORM_STATE } from '@/lib/form-state';

import { FormAlert } from './form-alert';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Ad</span>
          <input
            name="firstName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="given-name"
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Soyad</span>
          <input
            name="lastName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="family-name"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">E-posta</span>
        <input
          type="email"
          name="email"
          required
          maxLength={255}
          autoComplete="email"
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Şifre</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={fieldClass}
        />
        <span className="block text-xs text-muted">
          En az 8 karakter, en az bir harf ve bir rakam içermeli.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:text-[#16140f]"
      >
        {pending ? 'Kaydediliyor…' : 'Kayıt ol'}
      </button>
    </form>
  );
}
