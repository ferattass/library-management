import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/register-form';
import { getSessionUser } from '@/lib/session';

export default async function RegisterPage() {
  if (await getSessionUser()) redirect('/');

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kayıt ol</h1>
        <p className="mt-1 text-sm text-muted">
          Yeni hesaplar standart kullanıcı rolüyle açılır.
        </p>
      </div>

      <RegisterForm />

      <p className="text-sm text-muted">
        Zaten hesabınız var mı?{' '}
        <Link href="/giris" className="text-accent underline underline-offset-2">
          Giriş yapın
        </Link>
        .
      </p>
    </div>
  );
}
