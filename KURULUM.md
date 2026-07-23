# Kurulum

Kütüphane Yönetim Sistemi — NestJS 11 API + Next.js 16 arayüz + PostgreSQL 17.

## Gereksinimler

| Araç | Sürüm | Not |
|---|---|---|
| Docker Desktop | güncel | Veritabanı ve backend için |
| Node.js | 20.9+ | Arayüz için zorunlu, backend'i Docker'sız çalıştıracaksanız da gerekli |
| npm | 10+ | Node ile birlikte gelir |

---

## Yol 1 — Docker ile (önerilen)

```bash
cp .env.example .env
docker-compose up -d --build
```

Bu komut PostgreSQL ve backend'i birlikte ayağa kaldırır, migration'ları uygular.

**Ardından rolleri ve admin kullanıcısını oluşturun:**

```bash
docker exec kutupyonet-backend npx prisma db seed
```

> Bu adım **atlanamaz**. `docker-compose` yalnızca `prisma migrate deploy`
> çalıştırır; migration dosyalarında veri eklemesi yoktur ve `migrate deploy`
> seed'i tetiklemez. Seed çalıştırılmazsa `roles` tablosu boş kalır, kayıt olma
> isteği rol bağlayamaz ve kullanıcı **500** hatası alır.

Doğrulama:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"up", ...}
```

### Arayüzü başlatma

Arayüz compose'a dahil değildir, ayrıca çalıştırılır:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

---

## Yol 2 — Docker'sız (yalnızca veritabanı konteynerde)

```bash
cp .env.example .env
docker-compose up -d postgres     # sadece veritabanı

npm install
npm run prisma:deploy             # migration'ları uygula
npm run prisma:seed               # roller + admin
npm run start:dev                 # http://localhost:3000

cd frontend
cp .env.example .env.local
npm install
npm run dev                       # http://localhost:3001
```

`.env` içindeki `DATABASE_URL` host'tan çalışırken `@localhost`, konteyner
içinden çalışırken `@postgres` olmalıdır. Compose ikincisini kendisi geçer,
elle değiştirmeniz gerekmez.

---

## Adresler

| Adres | İçerik |
|---|---|
| http://localhost:3001 | Arayüz (katalog, ödünç, yorum, yönetim) |
| http://localhost:3000/api | API kökü |
| http://localhost:3000/api/docs | Swagger dokümantasyonu |
| http://localhost:3000/api/health | Sağlık kontrolü |
| `localhost:5434` | PostgreSQL |

Portlar `.env` üzerinden değiştirilebilir. **5434** seçilmiştir çünkü 5432 ve
5433 bu makinede başka projelerce kullanılıyor.

---

## Hesaplar

Seed yalnızca **admin** hesabını oluşturur:

| E-posta | Şifre | Rol | Kaynak |
|---|---|---|---|
| `admin@kutupyonet.local` | `Admin123!` | ADMIN | `prisma/seed.ts` |

Admin bilgileri ortam değişkeniyle değiştirilebilir:

```bash
SEED_ADMIN_EMAIL=yonetici@ornek.com
SEED_ADMIN_PASSWORD=BaskaBirSifre123
```

### Normal kullanıcı

Seed normal kullanıcı oluşturmaz; arayüzdeki **Kayıt ol** ekranından açılır.
Yeni hesaplar otomatik olarak `USER` rolü alır. Test için kullanılan hesap:

| E-posta | Şifre | Rol |
|---|---|---|
| `uye@kutupyonet.local` | `Uye12345` | USER |

Şifre kuralı: en az 8 karakter, en az bir harf ve bir rakam.

### Veritabanı erişimi

| Alan | Değer |
|---|---|
| Kullanıcı | `kutupyonet` |
| Şifre | `kutupyonet` |
| Veritabanı | `kutupyonet` |
| Bağlantı | `postgresql://kutupyonet:kutupyonet@localhost:5434/kutupyonet` |

> Bu değerler yalnızca geliştirme içindir. `JWT_SECRET` de dahil olmak üzere
> hepsi üretimde değiştirilmelidir: `openssl rand -base64 48`.

---

## Komutlar

### Backend (kök dizin)

| Komut | Açıklama |
|---|---|
| `npm run start:dev` | Watch modunda geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm test` | Birim testler (94 test) |
| `npm run test:e2e` | Entegrasyon testleri (28 test) |
| `npm run prisma:migrate` | Yeni migration üret ve uygula |
| `npm run prisma:deploy` | Mevcut migration'ları uygula |
| `npm run prisma:seed` | Roller + admin |
| `npm run prisma:studio` | Veritabanı arayüzü |
| `npm run db:reset` | Veritabanını sıfırla ve yeniden kur |

### Arayüz (`frontend/`)

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (3001) |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | ESLint |

---

## Durdurma

```bash
docker-compose stop          # konteynerleri durdur, veriyi koru
docker-compose down          # konteynerleri sil, veriyi koru
docker-compose down -v       # veriyi de sil (seed tekrar gerekir)
```

---

## Sorun giderme

**Prisma boş/anlamsız hata veriyor veya testler topluca patlıyor**
Önce Docker'a bakın, koda değil. Docker Desktop oturum ortasında kapanabiliyor:

```bash
docker info                  # daemon ayakta mı
docker-compose up -d postgres
```

**Kayıt olurken 500 hatası**
Seed çalıştırılmamış, `roles` tablosu boş. Yukarıdaki seed adımını uygulayın:

```bash
docker exec kutupyonet-postgres psql -U kutupyonet -d kutupyonet -tAc "select count(*) from roles;"
# 0 dönüyorsa seed gerekiyor
```

**`EADDRINUSE` — port 3000 dolu**
Genelde arka planda unutulmuş bir `npm run start:dev` ya da `kutupyonet-backend`
konteyneri vardır. İkisi aynı anda 3000'i tutamaz:

```bash
docker-compose stop backend   # konteyneri durdurup host'takini kullanın
```

**Arayüz "API sunucusuna ulaşılamıyor" diyor**
Backend kapalıdır. `curl http://localhost:3000/api/health` ile doğrulayın.
Arayüz backend'e tarayıcıdan değil kendi sunucusundan gider; `frontend/.env.local`
içindeki `API_BASE_URL` doğru olmalıdır.

**Migration `prisma migrate dev` sonrası CHECK kısıtları kayboldu**
CHECK kısıtları ve kısmi index'ler Prisma şema DSL'i ile ifade edilemediği için
`migration.sql` dosyalarının sonundaki MANUEL DDL bölümüne elle yazılmıştır.
Yeni migration üretirken bunların düşürülmediğini gözle kontrol edin.
