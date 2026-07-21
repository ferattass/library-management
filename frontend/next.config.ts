import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Depoda iki lockfile var (kök NestJS + bu klasör). Turbopack aksi halde
  // çalışma alanı kökünü kök package-lock.json'a göre seçip uyarı veriyor.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
