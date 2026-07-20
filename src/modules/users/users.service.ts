import { Injectable } from '@nestjs/common';
import type { RoleName } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: RoleName[];
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      // passwordHash bilinçli olarak seçilmiyor — select yerine varsayılan
      // dönüş kullanılsaydı hash'ler yanıta sızardı.
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    return users.map(({ userRoles, ...user }) => ({
      ...user,
      roles: userRoles.map((ur) => ur.role.name),
    }));
  }

  async findOne(id: number): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) {
      throw AppException.notFound('Kullanıcı');
    }

    const { userRoles, ...rest } = user;

    return { ...rest, roles: userRoles.map((ur) => ur.role.name) };
  }
}
