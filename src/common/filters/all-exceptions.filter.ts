import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCode } from '../exceptions/error-code.enum';

interface ErrorBody {
  code: ErrorCode | string;
  message: string | string[];
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * Tüm hataları tek bir gövde şekline indirger. Beklenmeyen hataların iç
 * detayları (stack, SQL metni) istemciye sızmaz — yalnızca loglanır.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      code,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: ErrorCode | string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, code: this.codeForStatus(status), message: payload };
      }

      const obj = payload as Record<string, unknown>;

      return {
        status,
        // AppException zaten `code` taşır; NestJS'in kendi hataları taşımaz.
        code: (obj.code as string) ?? this.codeForStatus(status),
        message: (obj.message as string | string[]) ?? exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Beklenmeyen bir hata oluştu',
    };
  }

  /** Framework kaynaklı hatalara da anlamlı bir kod verir. */
  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_TOKEN_INVALID;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
