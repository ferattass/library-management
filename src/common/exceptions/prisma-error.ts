import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

/**
 * Prisma hata kodlarını API hatalarına çevirir.
 *
 * Kısıt ihlallerini önceden sorgu atarak kontrol etmek yerine yakalıyoruz:
 * "önce sorgula sonra yaz" iki eşzamanlı istek arasında yarış durumu bırakır,
 * veritabanı kısıtı bırakmaz.
 */
export function mapPrismaError(
  error: unknown,
  context: { entity: string; onUnique?: AppException },
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      // Unique kısıt ihlali
      case 'P2002':
        throw (
          context.onUnique ??
          new AppException(
            ErrorCode.VALIDATION_FAILED,
            `Bu ${context.entity.toLowerCase()} zaten kayıtlı`,
            HttpStatus.CONFLICT,
          )
        );

      // Foreign key ihlali — ya bağlı kayıt var (RESTRICT) ya da
      // gösterilen ilişki mevcut değil.
      case 'P2003':
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          `${context.entity} başka kayıtlarla ilişkili olduğu için silinemez`,
          HttpStatus.CONFLICT,
        );

      // Güncellenecek/silinecek kayıt bulunamadı
      case 'P2025':
        throw AppException.notFound(context.entity);
    }
  }

  throw error;
}
