import { AdminTable } from '@/components/admin/field';
import { requireAdminToken, getAdminUsers } from '@/lib/admin-data';
import { formatDate } from '@/lib/format';

export default async function AdminUsersPage() {
  const token = await requireAdminToken();
  const users = await getAdminUsers(token);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Toplam {users.length} kullanıcı. API&apos;de kullanıcı silme ya da rol
        değiştirme ucu tanımlı olmadığı için bu ekran salt görüntülemedir.
      </p>

      <AdminTable headers={['Ad Soyad', 'E-posta', 'Rol', 'Durum', 'Kayıt']}>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-4 py-2">
              {user.firstName} {user.lastName}
            </td>
            <td className="px-4 py-2 text-muted">{user.email}</td>
            <td className="px-4 py-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className={`mr-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                    role === 'ADMIN'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-muted text-muted'
                  }`}
                >
                  {role}
                </span>
              ))}
            </td>
            <td className="px-4 py-2">
              {user.isActive ? (
                <span className="text-emerald-700 dark:text-emerald-400">Aktif</span>
              ) : (
                <span className="text-red-700 dark:text-red-400">Pasif</span>
              )}
            </td>
            <td className="px-4 py-2 text-muted">{formatDate(user.createdAt)}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
