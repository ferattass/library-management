import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  // --- Roller (BR-01.3) --------------------------------------------------
  // upsert kullanılır: seed birden çok kez çalıştırılabilir olmalıdır.
  const roles: { name: RoleName; description: string }[] = [
    { name: RoleName.USER, description: 'Standart kütüphane üyesi' },
    { name: RoleName.ADMIN, description: 'Katalog ve sistem yöneticisi' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log(`✔ ${roles.length} rol hazır`);

  // --- Varsayılan admin --------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@kutupyonet.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, rounds),
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.ADMIN },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`✔ Admin hazır: ${adminEmail}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Şifre: ${adminPassword}  (yalnızca geliştirme ortamı)`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed başarısız:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
