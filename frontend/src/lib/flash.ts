/**
 * İşlem sonrası bildirimleri URL üzerinden taşıyoruz.
 *
 * Sebep: iade/iptal/silme sonrası ilgili satır listeden kalkıyor ve düğmeyi
 * barındıran bileşen DOM'dan çıkıyor — mesajı o bileşende tutarsak kullanıcı
 * hiçbir onay göremiyor. Sayfa düzeyinde gösterince mesaj, işlemi tetikleyen
 * öğe kaybolsa da ayakta kalıyor.
 */
export const FLASH_MESSAGES: Record<string, string> = {
  'odunc-alindi': 'Kitap ödünç alındı. İyi okumalar!',
  'iade-alindi': 'İade alındı.',
  'rezerve-edildi': 'Rezervasyon kuyruğuna eklendiniz.',
  'rezervasyon-iptal': 'Rezervasyon iptal edildi.',
  'yorum-eklendi': 'Yorumunuz eklendi.',
  'yorum-silindi': 'Yorum silindi.',
  eklendi: 'Kayıt eklendi.',
  guncellendi: 'Kayıt güncellendi.',
  silindi: 'Kayıt silindi.',
};

export function flashMessage(code: string | undefined): string | null {
  if (!code) return null;
  return FLASH_MESSAGES[code] ?? null;
}
