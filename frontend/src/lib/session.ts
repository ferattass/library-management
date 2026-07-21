import 'server-only';

import { cookies } from 'next/headers';

import type { AuthResponse, SessionUser } from './types';

const TOKEN_COOKIE = 'kyn_token';
const USER_COOKIE = 'kyn_user';

/**
 * Token 15 dakikada dolduğu için cookie ömrünü de 15 dakika yapıyoruz;
 * böylece cookie kaybolduğunda kullanıcı zaten çıkmış sayılır ve elimizde
 * kesin süresi dolmuş bir token kalmaz. Backend'de refresh token yok.
 */
const TOKEN_MAX_AGE_SECONDS = 15 * 60;

/**
 * Kullanıcıyı ayrı bir cookie'de saklıyoruz çünkü GET /api/auth/me yalnızca
 * { id, email, roles } döndürüyor — ad ve soyad yok. Login yanıtındaki tam
 * kullanıcıyı tutmak, her sayfada isim gösterebilmenin tek yolu.
 */
export async function createSession(auth: AuthResponse): Promise<void> {
  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_MAX_AGE_SECONDS,
  };

  store.set(TOKEN_COOKIE, auth.accessToken, options);
  store.set(USER_COOKIE, JSON.stringify(auth.user), options);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(USER_COOKIE);
}

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.roles.includes('ADMIN') ?? false;
}
