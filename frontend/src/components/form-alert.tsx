import type { FormState } from '@/lib/form-state';

/** Sunucudan dönen doğrulama/iş kuralı hatalarını tek biçimde gösterir. */
export function FormAlert({ state }: { state: FormState }) {
  if (state.errors.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
    >
      {state.errors.length === 1 ? (
        state.errors[0]
      ) : (
        <ul className="list-inside list-disc space-y-1">
          {state.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
