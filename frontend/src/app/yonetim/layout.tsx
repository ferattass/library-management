import Link from 'next/link';

import { requireAdminToken } from '@/lib/admin-data';

const SEKMELER = [
  { href: '/yonetim/kitaplar', label: 'Kitaplar' },
  { href: '/yonetim/yazarlar', label: 'Yazarlar' },
  { href: '/yonetim/kategoriler', label: 'Kategoriler' },
  { href: '/yonetim/yayinevleri', label: 'Yayınevleri' },
  { href: '/yonetim/kullanicilar', label: 'Kullanıcılar' },
  { href: '/yonetim/oduncler', label: 'Ödünçler' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Yetkisiz kullanıcı buradan geri çevrilir; asıl yetki denetimi API'de.
  await requireAdminToken();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yönetim</h1>
        <p className="mt-1 text-sm text-muted">
          Yalnızca ADMIN rolündeki kullanıcılar erişebilir.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border pb-px">
        {SEKMELER.map((sekme) => (
          <Link
            key={sekme.href}
            href={sekme.href}
            className="rounded-t-md border border-transparent px-3 py-2 text-sm text-muted hover:border-border hover:bg-surface hover:text-foreground"
          >
            {sekme.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
