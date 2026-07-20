import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './error-code.enum';

/**
 * Tüm iş kuralı hataları bu sınıf üzerinden fırlatılır; böylece yanıt gövdesi
 * her zaman aynı şekle sahip olur: { code, message, statusCode, timestamp, path }
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }

  // --- Kimlik & yetki ---------------------------------------------------

  static emailTaken(): AppException {
    return new AppException(
      ErrorCode.AUTH_EMAIL_TAKEN,
      'Bu e-posta zaten kullanılıyor',
      HttpStatus.CONFLICT,
    );
  }

  /**
   * "E-posta bulunamadı" ile "şifre yanlış" bilinçli olarak ayrılmaz —
   * ayrım, saldırganın hangi e-postaların kayıtlı olduğunu keşfetmesine
   * (user enumeration) izin verirdi.
   */
  static invalidCredentials(): AppException {
    return new AppException(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      'E-posta veya şifre hatalı',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static accountDisabled(): AppException {
    return new AppException(
      ErrorCode.AUTH_ACCOUNT_DISABLED,
      'Hesabınız devre dışı',
      HttpStatus.FORBIDDEN,
    );
  }

  static tokenInvalid(): AppException {
    return new AppException(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Oturum geçersiz',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static forbidden(): AppException {
    return new AppException(
      ErrorCode.AUTH_FORBIDDEN,
      'Bu işlem için yetkiniz yok',
      HttpStatus.FORBIDDEN,
    );
  }

  // --- Genel ------------------------------------------------------------

  static notFound(what = 'Kayıt'): AppException {
    return new AppException(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${what} bulunamadı`,
      HttpStatus.NOT_FOUND,
    );
  }
}
