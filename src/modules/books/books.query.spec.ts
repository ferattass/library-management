import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { paginate } from '../../common/dto/pagination.dto';
import { buildOrderBy, buildWhere } from './books.service';
import { BookSortBy, QueryBookDto, SortOrder } from './dto/query-book.dto';

/** Query string'den gelen ham değerleri controller'daki gibi dönüştürür. */
const parse = (raw: Record<string, string>) =>
  plainToInstance(QueryBookDto, raw, { enableImplicitConversion: true });

describe('Kitap sorgu oluşturma', () => {
  describe('buildWhere', () => {
    it('filtre yoksa boş koşul üretir', () => {
      expect(buildWhere(parse({}))).toEqual({});
    });

    it('arama hem başlıkta hem yazar adında eşleşir', () => {
      const where = buildWhere(parse({ search: 'harry' }));
      const or = (where.AND as any[])[0].OR;

      expect(or[0].title).toEqual({ contains: 'harry', mode: 'insensitive' });
      expect(or[1].bookAuthors.some.author.OR).toHaveLength(2);
    });

    it('tüm metin karşılaştırmaları büyük/küçük harf duyarsızdır', () => {
      const where = buildWhere(
        parse({ search: 'a', category: 'b', author: 'c', publisher: 'd' }),
      );

      // Sabit sayı beklemek yerine ağacı gezip duyarlı kalan var mı bakıyoruz;
      // yeni bir filtre eklenince test kendiliğinden onu da kapsar.
      const sensitive: string[] = [];

      const walk = (node: unknown, path: string): void => {
        if (node === null || typeof node !== 'object') return;

        if (Array.isArray(node)) {
          node.forEach((item, i) => walk(item, `${path}[${i}]`));
          return;
        }

        const obj = node as Record<string, unknown>;
        const isComparison =
          typeof obj.contains === 'string' || typeof obj.equals === 'string';

        if (isComparison && obj.mode !== 'insensitive') {
          sensitive.push(path);
        }

        for (const [key, value] of Object.entries(obj)) {
          walk(value, `${path}.${key}`);
        }
      };

      walk(where, 'where');

      // Duyarlı kalsalardı 'Roman' ile 'roman' farklı sonuç verirdi.
      expect(sensitive).toEqual([]);
    });

    it('kategoriyi hem ad hem slug ile eşler', () => {
      const where = buildWhere(parse({ category: 'Bilim Kurgu' }));
      const or = (where.AND as any[])[0].bookCategories.some.category.OR;

      expect(or.map((c: any) => Object.keys(c)[0])).toEqual(['name', 'slug']);
    });

    it('birden fazla filtreyi AND ile birleştirir', () => {
      const where = buildWhere(parse({ category: 'Roman', author: 'Pamuk' }));

      // OR olsaydı "Roman kategorisindeki VEYA Pamuk'un yazdığı" dönerdi.
      expect(where.AND).toHaveLength(2);
    });

    it('boş string filtreleri koşula dönüşmez', () => {
      expect(buildWhere(parse({ search: '', category: '' }))).toEqual({});
    });
  });

  describe('buildOrderBy', () => {
    it('istenen alana ve yöne göre sıralar', () => {
      const order = buildOrderBy(
        parse({ sortBy: BookSortBy.Title, sortOrder: SortOrder.Desc }),
      );

      expect(order[0]).toEqual({ title: 'desc' });
    });

    it('kararlı sıralama için ikincil anahtar olarak id ekler', () => {
      const order = buildOrderBy(parse({ sortBy: BookSortBy.AvailableCopies }));

      // Olmasaydı eşit değerli satırların sırası sayfalar arasında
      // değişebilir, bir kayıt atlanabilir veya tekrarlanabilirdi.
      expect(order[order.length - 1]).toEqual({ id: 'asc' });
    });

    it('publishedYear sıralamasında NULL’ları sona atar', () => {
      const asc = buildOrderBy(
        parse({ sortBy: BookSortBy.PublishedYear, sortOrder: SortOrder.Asc }),
      );
      const desc = buildOrderBy(
        parse({ sortBy: BookSortBy.PublishedYear, sortOrder: SortOrder.Desc }),
      );

      // Her iki yönde de sona gitmeli; aksi halde yılı girilmemiş
      // kitaplar listenin başını doldururdu.
      expect(asc[0]).toEqual({ publishedYear: { sort: 'asc', nulls: 'last' } });
      expect(desc[0]).toEqual({ publishedYear: { sort: 'desc', nulls: 'last' } });
    });
  });

  describe('doğrulama', () => {
    const errors = (raw: Record<string, string>) =>
      validateSync(parse(raw)).flatMap((e) => Object.keys(e.constraints ?? {}));

    it('şema dışı sortBy değerini reddeder', () => {
      // Beyaz liste olmasaydı istemci herhangi bir kolon adı deneyebilirdi.
      expect(errors({ sortBy: 'passwordHash' })).toContain('isEnum');
    });

    it('limit üst sınırını zorlar', () => {
      expect(errors({ limit: '999999' })).toContain('max');
    });

    it('page en az 1 olmalıdır', () => {
      expect(errors({ page: '0' })).toContain('min');
    });

    it('varsayılanlar: page=1, limit=10, sortBy=title', () => {
      const q = parse({});

      expect([q.page, q.limit, q.sortBy]).toEqual([1, 10, BookSortBy.Title]);
      expect(errors({})).toHaveLength(0);
    });

    it('skip’i page ve limit’ten hesaplar', () => {
      expect(parse({ page: '3', limit: '20' }).skip).toBe(40);
    });
  });

  describe('paginate meta', () => {
    it('sayfa sayısını ve gezinme bayraklarını hesaplar', () => {
      const { meta } = paginate([], 9, { page: 2, limit: 3 });

      expect(meta).toEqual({
        page: 2,
        limit: 3,
        total: 9,
        totalPages: 3,
        hasPrevious: true,
        hasNext: true,
      });
    });

    it('son sayfada hasNext false olur', () => {
      expect(paginate([], 9, { page: 3, limit: 3 }).meta.hasNext).toBe(false);
    });

    it('sonuç yokken hasNext false olur', () => {
      // totalPages=0 iken page(1) > totalPages(0) karşılaştırması
      // yanıltıcı olurdu; kontrol total üzerinden yapılıyor.
      const { meta } = paginate([], 0, { page: 1, limit: 10 });

      expect([meta.totalPages, meta.hasNext, meta.hasPrevious]).toEqual([0, false, false]);
    });
  });
});
