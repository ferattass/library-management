import { flashMessage } from '@/lib/flash';

export function FlashBanner({ code }: { code: string | undefined }) {
  const message = flashMessage(code);
  if (!message) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
    >
      {message}
    </div>
  );
}
