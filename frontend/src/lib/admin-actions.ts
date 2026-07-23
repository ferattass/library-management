'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiRequest } from './api';
import type { FormState } from './form-state';
import { destroySession, getSessionUser, getToken } from './session';

function toFormState(error: unknown): FormState {
  if (error instanceof ApiError) return { errors: error.messages };
  return { errors: ['Beklenmeyen bir hata oluştu.'] };
}

/**
 * Her yönetim eylemi rolü sunucuda yeniden doğrular.
 *
 * Server Action'lar doğrudan POST ile de çağrılabildiği için, sayfayı
 * ADMIN'e kapatmak tek başına yeterli değil; kontrol eylemin içinde olmalı.
 * Son söz yine backend'in ADMIN guard'ında.
 */
async function withAdmin<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const [user, token] = await Promise.all([getSessionUser(), getToken()]);
  if (!user || !token) redirect('/giris');
  if (!user.roles.includes('ADMIN')) redirect('/');

  try {
    return await fn(token);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await destroySession();
      redirect('/giris?sebep=oturum-doldu');
    }
    throw error;
  }
}

/** Boş metin alanlarını hiç göndermeyiz: forbidNonWhitelisted açık, boş string 400 döndürür. */
function optional(formData: FormData, field: string): string | undefined {
  const value = String(formData.get(field) ?? '').trim();
  return value === '' ? undefined : value;
}

function numbers(formData: FormData, field: string): number[] {
  return formData.getAll(field).map(Number).filter(Number.isFinite);
}

/** Prisma DTO'ları tanımsız alanları kabul etmez; undefined olanları ayıklar. */
function clean<T extends Record<string, unknown>>(body: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// --- Yazar ------------------------------------------------------------------

export async function saveAuthorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = optional(formData, 'id');
  const body = clean({
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    biography: optional(formData, 'biography'),
    birthDate: optional(formData, 'birthDate'),
  });

  try {
    await withAdmin((token) =>
      id
        ? apiRequest(`/authors/${id}`, { method: 'PATCH', body, token })
        : apiRequest('/authors', { method: 'POST', body, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/yazarlar');
  redirect(`/yonetim/yazarlar?bilgi=${id ? 'guncellendi' : 'eklendi'}`);
}

export async function deleteAuthorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await withAdmin((token) =>
      apiRequest(`/authors/${Number(formData.get('id'))}`, {
        method: 'DELETE',
        token,
      }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/yazarlar');
  redirect('/yonetim/yazarlar?bilgi=silindi');
}

// --- Kategori ---------------------------------------------------------------

export async function saveCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = optional(formData, 'id');
  const body = clean({
    name: String(formData.get('name') ?? '').trim(),
    slug: optional(formData, 'slug'),
    description: optional(formData, 'description'),
  });

  try {
    await withAdmin((token) =>
      id
        ? apiRequest(`/categories/${id}`, { method: 'PATCH', body, token })
        : apiRequest('/categories', { method: 'POST', body, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/kategoriler');
  redirect(`/yonetim/kategoriler?bilgi=${id ? 'guncellendi' : 'eklendi'}`);
}

export async function deleteCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await withAdmin((token) =>
      apiRequest(`/categories/${Number(formData.get('id'))}`, {
        method: 'DELETE',
        token,
      }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/kategoriler');
  redirect('/yonetim/kategoriler?bilgi=silindi');
}

// --- Yayınevi ---------------------------------------------------------------

export async function savePublisherAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = optional(formData, 'id');
  const body = clean({
    name: String(formData.get('name') ?? '').trim(),
    website: optional(formData, 'website'),
    address: optional(formData, 'address'),
  });

  try {
    await withAdmin((token) =>
      id
        ? apiRequest(`/publishers/${id}`, { method: 'PATCH', body, token })
        : apiRequest('/publishers', { method: 'POST', body, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/yayinevleri');
  redirect(`/yonetim/yayinevleri?bilgi=${id ? 'guncellendi' : 'eklendi'}`);
}

export async function deletePublisherAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await withAdmin((token) =>
      apiRequest(`/publishers/${Number(formData.get('id'))}`, {
        method: 'DELETE',
        token,
      }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/yayinevleri');
  redirect('/yonetim/yayinevleri?bilgi=silindi');
}

// --- Kitap ------------------------------------------------------------------

export async function saveBookAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = optional(formData, 'id');
  const publishedYear = optional(formData, 'publishedYear');

  const body = clean({
    title: String(formData.get('title') ?? '').trim(),
    isbn: optional(formData, 'isbn'),
    publisherId: Number(formData.get('publisherId')),
    publishedYear: publishedYear === undefined ? undefined : Number(publishedYear),
    totalCopies: Number(formData.get('totalCopies')),
    description: optional(formData, 'description'),
    authorIds: numbers(formData, 'authorIds'),
    categoryIds: numbers(formData, 'categoryIds'),
  });

  try {
    await withAdmin((token) =>
      id
        ? apiRequest(`/books/${id}`, { method: 'PATCH', body, token })
        : apiRequest('/books', { method: 'POST', body, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/kitaplar');
  revalidatePath('/');
  redirect(`/yonetim/kitaplar?bilgi=${id ? 'guncellendi' : 'eklendi'}`);
}

export async function deleteBookAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await withAdmin((token) =>
      apiRequest(`/books/${Number(formData.get('id'))}`, {
        method: 'DELETE',
        token,
      }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/yonetim/kitaplar');
  revalidatePath('/');
  redirect('/yonetim/kitaplar?bilgi=silindi');
}
