/**
 * Ayrı dosyada duruyor çünkü `'use server'` işaretli bir modül yalnızca
 * async fonksiyon export edebilir — sabit ya da nesne export'u derlemeyi
 * kırar (invalid-use-server-value).
 *
 * Yalnızca hata taşır: başarı bildirimleri [[flash]] üzerinden URL ile
 * gider, çünkü başarıdan sonra formu barındıran satır sıklıkla DOM'dan
 * kalkıyor ve orada tutulan mesaj kullanıcıya hiç görünmüyor.
 */
export interface FormState {
  errors: string[];
}

export const EMPTY_FORM_STATE: FormState = { errors: [] };
