'use client';

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="text-sm text-muted">
        Sayfa yüklenemedi. API sunucusu çalışmıyor olabilir.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:text-[#16140f]"
      >
        Tekrar dene
      </button>
    </div>
  );
}
