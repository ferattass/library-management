import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

import { logoutAction } from '@/lib/actions';
import { getSessionUser } from '@/lib/session';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  // latin-ext olmadan ğ, ş, İ gibi Türkçe harfler yedek fontla çizilir.
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'Kütüphane Yönetim Sistemi',
  description: 'Katalog, ödünç alma ve rezervasyon arayüzü',
};

async function Header() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Kütüphane
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Katalog
        </Link>
        {user && (
          <Link href="/hesabim" className="text-sm text-muted hover:text-foreground">
            Hesabım
          </Link>
        )}
        {user?.roles.includes('ADMIN') && (
          <Link
            href="/yonetim/kitaplar"
            className="text-sm font-medium text-accent hover:opacity-80"
          >
            Yönetim
          </Link>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted">
                {user.firstName} {user.lastName}
                {user.roles.includes('ADMIN') && (
                  <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">
                    ADMIN
                  </span>
                )}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-muted"
                >
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/giris" className="text-muted hover:text-foreground">
                Giriş
              </Link>
              <Link
                href="/kayit"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-white dark:text-[#16140f]"
              >
                Kayıt ol
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
          Kütüphane Yönetim Sistemi — NestJS API üzerine Next.js arayüzü
        </footer>
      </body>
    </html>
  );
}
