'use client';

import { useActionState } from 'react';

import { loginAction } from '@/lib/actions';
import { EMPTY_FORM_STATE } from '@/lib/form-state';

import { FormAlert } from './form-alert';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />

      <label className="block space-y-1">
        <span className="text-sm font-medium">E-posta</span>
        <input
          type="email"
          name="email"
          required
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
          autoComplete="current-password"
          className={fieldClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:text-[#16140f]"
      >
        {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
