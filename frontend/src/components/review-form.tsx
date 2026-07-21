'use client';

import { useActionState } from 'react';

import { createReviewAction } from '@/lib/actions';
import { EMPTY_FORM_STATE } from '@/lib/form-state';

import { FormAlert } from './form-alert';

export function ReviewForm({ bookId }: { bookId: number }) {
  const [state, formAction, pending] = useActionState(
    createReviewAction,
    EMPTY_FORM_STATE,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <h3 className="font-medium">Yorum yaz</h3>
      <FormAlert state={state} />

      <input type="hidden" name="bookId" value={bookId} />

      <label className="block space-y-1">
        <span className="text-sm font-medium">Puan</span>
        <select
          name="rating"
          defaultValue="5"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {'★'.repeat(value)} ({value})
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">
          Yorum <span className="font-normal text-muted">(isteğe bağlı)</span>
        </span>
        <textarea
          name="comment"
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:text-[#16140f]"
      >
        {pending ? 'Gönderiliyor…' : 'Gönder'}
      </button>
    </form>
  );
}
