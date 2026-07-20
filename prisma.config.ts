// Prisma 7 yapılandırması.
// Prisma 6'da datasource.url schema.prisma içindeydi; 7'de CLI ayarları
// buraya taşındı ve çalışma zamanı bağlantısı driver adapter ile kuruluyor.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
