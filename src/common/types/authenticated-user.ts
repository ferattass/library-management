import type { RoleName } from '@prisma/client';

/** JWT içinde taşınan veri. */
export interface JwtPayload {
  /** Kullanıcı id'si (JWT standardı: subject). */
  sub: number;
  email: string;
  roles: RoleName[];
}

/** JwtStrategy.validate() sonrası request.user'a yerleşen nesne. */
export interface AuthenticatedUser {
  id: number;
  email: string;
  roles: RoleName[];
}
