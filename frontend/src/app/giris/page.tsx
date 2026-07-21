import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { getSessionUser } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getSessionUser()) redirect('/');

  const { sebep } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Giriş yap</h1>
        <p className="mt-1 text-sm text-muted">
          Ödünç alma, rezervasyon ve yorum için oturum gerekir.
        </p>
      </div>

      {sebep === 'oturum-doldu' && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.
        </div>
      )}

      <LoginForm />

      <p className="text-sm text-muted">
        Hesabınız yok mu?{' '}
        <Link href="/kayit" className="text-accent underline underline-offset-2">
          Kayıt olun
        </Link>
        .
      </p>
    </div>
  );
}
