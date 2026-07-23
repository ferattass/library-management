import 'server-only';

import { redirect } from 'next/navigation';

import { apiRequest, toQuery } from './api';
import { getSessionUser, getToken } from './session';
import type {
  Author,
  Book,
  Borrowing,
  Category,
  Paginated,
  Publisher,
  Reservation,
  UserSummary,
} from './types';

/**
 * Yönetim sayfalarının ortak kapısı.
 *
 * Backend zaten ADMIN kontrolü yapıyor; buradaki kontrol yetki değil
 * yönlendirme amaçlı — yetkisiz kullanıcıya boş tablo ve hata yığını yerine
 * anlamlı bir sayfa göstermek için. Güvenlik hâlâ API tarafında.
 */
export async function requireAdminToken(): Promise<string> {
  const [user, token] = await Promise.all([getSessionUser(), getToken()]);
  if (!user || !token) redirect('/giris');
  if (!user.roles.includes('ADMIN')) redirect('/');
  return token;
}

export async function getAdminAuthors(): Promise<Author[]> {
  return apiRequest<Author[]>('/authors');
}

export async function getAdminPublishers(): Promise<Publisher[]> {
  return apiRequest<Publisher[]>('/publishers');
}

export async function getAdminCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories');
}

/** Yönetim listesi kataloğun aksine stoku düşük olanı da göstermeli. */
export async function getAdminBooks(page: number): Promise<Paginated<Book>> {
  return apiRequest<Paginated<Book>>(
    `/books${toQuery({ page, limit: 20, sortBy: 'title', sortOrder: 'asc' })}`,
  );
}

export async function getAdminUsers(token: string): Promise<UserSummary[]> {
  return apiRequest<UserSummary[]>('/users', { token });
}

/** ADMIN için tüm kullanıcıların ödünçleri döner. */
export async function getAllBorrowings(
  token: string,
  status?: string,
): Promise<Paginated<Borrowing>> {
  return apiRequest<Paginated<Borrowing>>(
    `/borrowings${toQuery({ limit: 100, status })}`,
    { token },
  );
}

/** ADMIN'in tüm kuyrukları görmesi için `all=true` gerekiyor. */
export async function getAllReservations(
  token: string,
): Promise<Paginated<Reservation>> {
  return apiRequest<Paginated<Reservation>>(
    `/reservations${toQuery({ limit: 100, all: 'true' })}`,
    { token },
  );
}
