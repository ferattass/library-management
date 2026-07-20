/**
 * Türkçe karakterleri URL güvenli karşılıklarına çevirir.
 *
 * String.normalize('NFD') ile aksan ayıklama yöntemi burada yetersiz kalır:
 * 'ı' ve 'ş' ayrıştırılabilir aksan değildir, 'ı' için NFD hiçbir şey yapmaz.
 * Bu yüzden eşleme elle tanımlanıyor.
 */
const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function slugify(input: string): string {
  return input
    .split('')
    .map((char) => TR_MAP[char] ?? char)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // kalan aksanlar (é, à, ñ ...)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
