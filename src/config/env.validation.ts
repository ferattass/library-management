import { Type, plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // process.env değerleri her zaman string gelir; sayısal alanlarda
  // dönüşümü açıkça belirtmek gerekir.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(16, {
    message:
      'JWT_SECRET en az 16 karakter olmalıdır. Üretim için: openssl rand -base64 48',
  })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN = '15m';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_ROUNDS = 12;
}

/**
 * Eksik veya hatalı ortam değişkenlerini uygulama ayağa kalkarken yakalar.
 * İlk isteğin 500 dönmesindense açılışta patlamak tercih edilir.
 */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const parsed = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(parsed, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Ortam değişkeni doğrulaması başarısız:\n${detail}`);
  }

  return parsed;
}
