'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiRequest } from './api';
import type { FormState } from './form-state';
import { createSession, destroySession, getToken } from './session';
import type { AuthResponse } from './types';

function toFormState(error: unknown): FormState {
  if (error instanceof ApiError) return { errors: error.messages };
  return { errors: ['Beklenmeyen bir hata oluştu.'] };
}

/**
 * Oturum gerektiren her işlemin ortak sarmalayıcısı.
 *
 * Token 15 dakikada dolduğu ve yenileme uç noktası olmadığı için, 401
 * gördüğümüz anda cookie'yi temizleyip giriş sayfasına yolluyoruz — aksi
 * halde kullanıcı "giriş yapmış" görünüp her işlemde hata alırdı.
 */
async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getToken();
  if (!token) redirect('/giris');

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

// --- Kimlik doğrulama -------------------------------------------------------

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const auth = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      },
    });
    await createSession(auth);
  } catch (error) {
    return toFormState(error);
  }
  // redirect() bir istisna fırlattığı için try bloğunun dışında olmalı.
  redirect('/');
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const auth = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
      },
    });
    await createSession(auth);
  } catch (error) {
    return toFormState(error);
  }
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/giris');
}

// --- Ödünç alma -------------------------------------------------------------

export async function borrowAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const bookId = Number(formData.get('bookId'));
  try {
    await withAuth((token) =>
      apiRequest('/borrowings', { method: 'POST', body: { bookId }, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath(`/kitaplar/${bookId}`);
  revalidatePath('/hesabim');
  redirect(`/kitaplar/${bookId}?bilgi=odunc-alindi`);
}

export async function returnAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const borrowingId = Number(formData.get('borrowingId'));
  try {
    await withAuth((token) =>
      apiRequest(`/borrowings/${borrowingId}/return`, { method: 'PATCH', token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/hesabim');
  redirect('/hesabim?bilgi=iade-alindi');
}

// --- Rezervasyon ------------------------------------------------------------

export async function reserveAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const bookId = Number(formData.get('bookId'));
  try {
    await withAuth((token) =>
      apiRequest('/reservations', { method: 'POST', body: { bookId }, token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath(`/kitaplar/${bookId}`);
  revalidatePath('/hesabim');
  redirect(`/kitaplar/${bookId}?bilgi=rezerve-edildi`);
}

export async function cancelReservationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reservationId = Number(formData.get('reservationId'));
  try {
    await withAuth((token) =>
      apiRequest(`/reservations/${reservationId}/cancel`, { method: 'PATCH', token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath('/hesabim');
  redirect('/hesabim?bilgi=rezervasyon-iptal');
}

// --- Yorum ------------------------------------------------------------------

export async function createReviewAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const bookId = Number(formData.get('bookId'));
  const comment = String(formData.get('comment') ?? '').trim();
  try {
    await withAuth((token) =>
      apiRequest('/reviews', {
        method: 'POST',
        // forbidNonWhitelisted açık: boş yorumu hiç göndermiyoruz,
        // fazladan alan 400 döndürür.
        body: comment
          ? { bookId, rating: Number(formData.get('rating')), comment }
          : { bookId, rating: Number(formData.get('rating')) },
        token,
      }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath(`/kitaplar/${bookId}`);
  redirect(`/kitaplar/${bookId}?bilgi=yorum-eklendi`);
}

export async function deleteReviewAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reviewId = Number(formData.get('reviewId'));
  const bookId = Number(formData.get('bookId'));
  try {
    await withAuth((token) =>
      apiRequest(`/reviews/${reviewId}`, { method: 'DELETE', token }),
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath(`/kitaplar/${bookId}`);
  redirect(`/kitaplar/${bookId}?bilgi=yorum-silindi`);
}
