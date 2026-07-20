# Kütüphane Yönetim Sistemi

NestJS 11 + Prisma 7 + PostgreSQL 17 ile geliştirilen kütüphane yönetim API'si.

## Hızlı Başlangıç

```bash
cp .env.example .env      # gerekirse değerleri düzenleyin
docker-compose up -d      # postgres + backend
```

Ardından:

| Adres | İçerik |
|---|---|
| http://localhost:3000/api/health | Sağlık kontrolü |
| http://localhost:3000/api/docs | Swagger dokümantasyonu |

### Docker olmadan (yerel geliştirme)

```bash
docker-compose up -d postgres   # sadece veritabanı
npm install
npm run prisma:deploy           # migration'ları uygula
npm run prisma:seed             # rolleri ve admin kullanıcıyı oluştur
npm run start:dev
```

`.env` içindeki `DATABASE_URL` host'tan çalışırken `@localhost`, konteyner
içinden çalışırken `@postgres` olmalıdır. Compose ikincisini kendisi geçer.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run start:dev` | Watch modunda geliştirme sunucusu |
| `npm run build` | Üretim derlemesi (`dist/`) |
| `npm test` | Unit testler |
| `npm run test:e2e` | Integration testler |
| `npm run prisma:migrate` | Yeni migration üret ve uygula |
| `npm run prisma:deploy` | Mevcut migration'ları uygula (üretim) |
| `npm run prisma:studio` | Veritabanı GUI |
| `npm run prisma:seed` | Roller + varsayılan admin |
| `npm run db:reset` | Veritabanını sıfırla ve yeniden kur |

## Proje Yapısı

```
kutupyonet/
├── docs/                       # Sprint 1 analiz ve tasarım dokümanları
│   ├── 01-is-analizi.md        # aktörler, iş kuralları, hata senaryoları
│   ├── 02-er-diyagram.md       # ER diyagramı + durum makineleri
│   └── 03-veritabani-tasarimi.md   # PK/FK/index/CHECK kararları
├── prisma/
│   ├── schema.prisma           # veri modeli
│   ├── seed.ts                 # roller + admin
│   └── migrations/             # sürümlenmiş SQL
├── src/
│   ├── config/                 # ortam değişkeni doğrulaması
│   ├── prisma/                 # PrismaService (global modül)
│   ├── health/                 # sağlık kontrolü
│   ├── common/                 # (Sprint 2+) guard, filter, decorator, dto
│   ├── modules/                # (Sprint 2+) iş modülleri
│   │   ├── auth/
│   │   ├── users/
│   │   ├── authors/
│   │   ├── categories/
│   │   ├── publishers/
│   │   ├── books/
│   │   ├── borrowings/
│   │   ├── reservations/
│   │   └── reviews/
│   ├── app.module.ts
│   └── main.ts
├── test/                       # e2e testler
├── docker-compose.yml
├── Dockerfile                  # çok aşamalı: development / production
└── prisma.config.ts            # Prisma 7 CLI yapılandırması
```

Her iş modülü aynı iskeleti izler:

```
modules/books/
├── dto/
│   ├── create-book.dto.ts
│   ├── update-book.dto.ts
│   └── query-book.dto.ts
├── books.controller.ts
├── books.service.ts
├── books.module.ts
└── books.service.spec.ts
```

## Endpoint'ler

| Metot | Yol | Erişim |
|---|---|---|
| `GET` | `/api/health` | Herkese açık |
| `POST` | `/api/auth/register` | Herkese açık |
| `POST` | `/api/auth/login` | Herkese açık |
| `GET` | `/api/auth/me` | Token gerekli |
| `GET` | `/api/users` | ADMIN |
| `GET` | `/api/users/:id` | ADMIN |
| `GET` | `/api/authors`, `/api/authors/:id` | Herkese açık |
| `POST` `PATCH` `DELETE` | `/api/authors` | ADMIN |
| `GET` | `/api/categories`, `/api/categories/:id` | Herkese açık |
| `POST` `PATCH` `DELETE` | `/api/categories` | ADMIN |
| `GET` | `/api/publishers`, `/api/publishers/:id` | Herkese açık |
| `POST` `PATCH` `DELETE` | `/api/publishers` | ADMIN |
| `GET` | `/api/books`, `/api/books/:id` | Herkese açık |
| `POST` `PATCH` `DELETE` | `/api/books` | ADMIN |

Seed ile gelen admin: `admin@kutupyonet.local` / `Admin123!`

### Stok modeli

`totalCopies` kütüphanedeki toplam kopya, `availableCopies` rafta olan kopya.
`totalCopies` güncellenirken `availableCopies` **fark kadar kaydırılır** —
doğrudan eşitlenseydi ödünçteki kopyalar yok sayılıp stok şişerdi. Ödünçteki
sayının altına indirmek 409 döner.

### Yetkilendirme modeli

Guard'lar global olarak kayıtlıdır — **her endpoint varsayılan olarak
korumalıdır**. Bir endpoint'i açmak `@Public()` ile bilinçli bir karar
gerektirir; tersi (varsayılan açık, korumayı elle eklemek) unutulduğunda
sessizce açık bırakır.

```ts
@Public()                    // kimlik doğrulaması gerekmez
@Roles(RoleName.ADMIN)       // yalnızca ADMIN
@CurrentUser() user          // doğrulanmış kullanıcıyı enjekte eder
```

Roller token'dan okunmaz, **her istekte veritabanından teyit edilir**.
Maliyeti istek başına bir sorgu; karşılığında pasifleştirilen veya rolü
geri alınan kullanıcı, token'ının süresi dolmadan da etkisiz kalır.

## Migration notu

CHECK kısıtları ve kısmi (partial) index'ler Prisma şema DSL'i ile ifade
edilemediğinden `prisma/migrations/*/migration.sql` dosyasının sonundaki
**MANUEL DDL** bölümüne elle yazılmıştır.

Prisma bu nesneleri modellemediği için, ileride `prisma migrate dev` ile
üretilen migration'ların bunları `DROP` etmediğini **gözle kontrol edin**.
Etkilenen nesneler:

- `books_available_copies_non_negative` ve diğer CHECK kısıtları
- `reservations_active_user_book_uniq` (kısmi unique index)
- `borrowings_active_idx`, `reservations_queue_idx`, `books_available_idx`
- `books_title_trgm_idx`, `authors_name_trgm_idx`

## Sprint Durumu

- [x] **Sprint 1** — Analiz, ER diyagramı, veritabanı tasarımı, Docker
- [x] **Sprint 2** — Authentication & Authorization (JWT, bcrypt, roller)
- [x] **Sprint 3** — Katalog yönetimi (author, category, publisher, book CRUD)
- [ ] **Sprint 4** — Arama, filtreleme, sayfalama, sıralama
- [ ] **Sprint 5** — Ödünç alma & rezervasyon (transaction, stok kontrolü)
- [ ] **Sprint 6** — Yorum, loglama, test, Swagger

Ayrıntılı gereksinimler: `Proje 2 - Kütüphane Yönetim Sistemi.pdf`
