import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted">
        Aradığınız kayıt silinmiş ya da hiç var olmamış olabilir.
      </p>
      <Link
        href="/"
        className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white dark:text-[#16140f]"
      >
        Kataloga dön
      </Link>
    </div>
  );
}
