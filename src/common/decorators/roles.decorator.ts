import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Endpoint'i belirli rollerle sınırlar. Birden fazla rol verilirse
 * bunlardan **herhangi birine** sahip olmak yeterlidir (OR).
 *
 * @example @Roles('ADMIN')
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
