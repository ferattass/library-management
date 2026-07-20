# Sprint 1 — İş Analizi

## 1. Aktörler ve Yetkiler

Sistemde iki rol vardır: `USER` ve `ADMIN`. `ADMIN`, `USER`'ın yapabildiği her şeyi yapabilir.

### USER (Üye)

| İşlem | Endpoint | Not |
|---|---|---|
| Kayıt olma | `POST /auth/register` | Herkese açık |
| Giriş yapma | `POST /auth/login` | Herkese açık |
| Kitap listeleme / arama / filtreleme | `GET /books` | Sayfalama zorunlu |
| Kitap detayı görüntüleme | `GET /books/:id` | Yazar, kategori, yayınevi dahil |
| Yazar / kategori / yayınevi listeleme | `GET /authors`, `/categories`, `/publishers` | Salt okunur |
| Kitap ödünç alma | `POST /borrowings` | Stok kontrolüne tabi |
| Ödünç aldığını iade etme | `PATCH /borrowings/:id/return` | Sadece kendi kaydı |
| Kendi ödünç geçmişini görme | `GET /borrowings/me` | |
| Rezervasyon oluşturma | `POST /reservations` | Stok 0 iken anlamlı |
| Rezervasyonlarını listeleme | `GET /reservations` | Sadece kendi kayıtları |
| Rezervasyon iptali | `PATCH /reservations/:id/cancel` | Sadece kendi kaydı |
| Yorum + puan verme | `POST /reviews` | Kitap başına 1 kez |
| Yorumları okuma | `GET /reviews?bookId=` | Herkese açık |

### ADMIN (Yönetici)

| İşlem | Endpoint | Not |
|---|---|---|
| Yazar CRUD | `POST/PATCH/DELETE /authors` | |
| Kategori CRUD | `POST/PATCH/DELETE /categories` | |
| Yayınevi CRUD | `POST/PATCH/DELETE /publishers` | |
| Kitap CRUD | `POST/PATCH/DELETE /books` | Çoklu yazar/kategori ataması |
| Stok güncelleme | `PATCH /books/:id` | `totalCopies` değişimi |
| Tüm ödünç kayıtlarını görme | `GET /borrowings` | Filtrelenebilir |
| Tüm rezervasyonları görme | `GET /reservations?all=true` | |
| Yorum silme (moderasyon) | `DELETE /reviews/:id` | |

---

## 2. İş Kuralları

### BR-01 — Kimlik ve Erişim
- **BR-01.1** E-posta sistem genelinde benzersizdir.
- **BR-01.2** Şifreler **bcrypt** (cost 12) ile hash'lenir; düz metin hiçbir yerde saklanmaz veya loglanmaz.
- **BR-01.3** Yeni kayıtlara varsayılan olarak `USER` rolü atanır. `ADMIN` rolü yalnızca seed ile veya mevcut bir admin tarafından verilir.
- **BR-01.4** Access token'ın içinde `sub` (userId), `email` ve `roles` claim'leri bulunur.
- **BR-01.5** Pasif (`isActive = false`) kullanıcı giriş yapamaz.

### BR-02 — Katalog
- **BR-02.1** ISBN benzersizdir (veri girilmişse).
- **BR-02.2** Bir kitabın en az bir yazarı ve en az bir kategorisi olmalıdır.
- **BR-02.3** Bir kitap tam olarak bir yayınevine aittir.
- **BR-02.4** Aktif ödünç kaydı bulunan kitap silinemez.
- **BR-02.5** Kendisine bağlı kitabı olan yazar/kategori/yayınevi silinemez (`RESTRICT`).
- **BR-02.6** `totalCopies >= 0` ve `availableCopies >= 0` ve `availableCopies <= totalCopies`.

### BR-03 — Ödünç Alma (Borrowing)
- **BR-03.1** Ödünç alabilmek için `availableCopies > 0` olmalıdır.
- **BR-03.2** Stok **hiçbir koşulda negatife düşemez** — veritabanı seviyesinde `CHECK` kısıtı ile garanti altına alınır.
- **BR-03.3** Ödünç kaydı oluşturma **ve** stok azaltma **tek transaction** içinde yapılır.
- **BR-03.4** Aynı kullanıcı, iade etmediği bir kitabı tekrar ödünç alamaz.
- **BR-03.5** Bir kullanıcının aynı anda en fazla **5** aktif ödünç kaydı olabilir.
- **BR-03.6** Varsayılan iade süresi **14 gün**dür (`dueDate = borrowedAt + 14g`).
- **BR-03.7** İade edilince `availableCopies` artırılır — bu da aynı transaction içinde yapılır.
- **BR-03.8** Zaten iade edilmiş bir kayıt tekrar iade edilemez.

### BR-04 — Rezervasyon (Reservation)
- **BR-04.1** Aynı kullanıcı, aynı kitap için **aktif** bir rezervasyonu varken yenisini oluşturamaz.
- **BR-04.2** Rezervasyon sırası korunur — FIFO, `reservedAt` ve `queuePosition` ile.
- **BR-04.3** Elinde o kitabın aktif ödünç kaydı olan kullanıcı rezervasyon yapamaz.
- **BR-04.4** Kitap iade edilince sıradaki rezervasyon `READY` durumuna geçer.
- **BR-04.5** `READY` durumundaki rezervasyon **3 gün** içinde ödünce dönüştürülmezse `EXPIRED` olur ve sıra bir sonrakine geçer.

### BR-05 — Yorum (Review)
- **BR-05.1** Puan **1–5** aralığında bir tam sayıdır — DB seviyesinde `CHECK` kısıtı ile.
- **BR-05.2** Aynı kullanıcı aynı kitaba **yalnızca bir** yorum yapabilir (`UNIQUE(userId, bookId)`).
- **BR-05.3** Kullanıcı kendi yorumunu güncelleyebilir/silebilir; admin herhangi bir yorumu silebilir.

---

## 3. Hata Senaryoları

| Kod | HTTP | Senaryo | Mesaj |
|---|---|---|---|
| `AUTH_EMAIL_TAKEN` | 409 | Kayıtlı e-posta ile register | Bu e-posta zaten kullanılıyor |
| `AUTH_INVALID_CREDENTIALS` | 401 | Hatalı e-posta **veya** şifre | E-posta veya şifre hatalı |
| `AUTH_ACCOUNT_DISABLED` | 403 | Pasif hesapla giriş | Hesabınız devre dışı |
| `AUTH_TOKEN_INVALID` | 401 | Geçersiz/süresi dolmuş JWT | Oturum geçersiz |
| `AUTH_FORBIDDEN` | 403 | Yetkisiz rol | Bu işlem için yetkiniz yok |
| `VALIDATION_FAILED` | 400 | DTO doğrulaması başarısız | Alan bazlı hata listesi |
| `RESOURCE_NOT_FOUND` | 404 | Olmayan kayıt | Kayıt bulunamadı |
| `BOOK_ISBN_TAKEN` | 409 | Mükerrer ISBN | Bu ISBN zaten kayıtlı |
| `BOOK_HAS_ACTIVE_BORROWINGS` | 409 | Aktif ödüncü olan kitabı silme | Kitabın aktif ödünç kaydı var |
| `BOOK_OUT_OF_STOCK` | 409 | `availableCopies = 0` iken ödünç | Kitap şu anda mevcut değil |
| `BORROW_LIMIT_EXCEEDED` | 409 | 5 aktif ödünç sınırı aşıldı | Ödünç alma limitiniz doldu |
| `BORROW_ALREADY_ACTIVE` | 409 | Aynı kitap tekrar ödünç | Bu kitap zaten sizde |
| `BORROW_ALREADY_RETURNED` | 409 | İkinci kez iade | Bu kayıt zaten iade edilmiş |
| `RESERVATION_DUPLICATE` | 409 | Aynı kitaba ikinci aktif rezervasyon | Bu kitap için zaten rezervasyonunuz var |
| `RESERVATION_BOOK_IN_HAND` | 409 | Elindeki kitaba rezervasyon | Bu kitap şu anda sizde |
| `REVIEW_DUPLICATE` | 409 | Aynı kitaba ikinci yorum | Bu kitaba zaten yorum yaptınız |
| `REVIEW_RATING_RANGE` | 400 | Puan 1–5 dışında | Puan 1 ile 5 arasında olmalı |

**Not:** `AUTH_INVALID_CREDENTIALS` bilinçli olarak "e-posta bulunamadı" ile "şifre yanlış" ayrımını yapmaz — bu ayrım kullanıcı numaralandırma (user enumeration) açığı yaratır.

---

## 4. Eşzamanlılık (Concurrency)

Şartnamedeki *"Aynı anda birden fazla ödünç işlemi yönetilebilmelidir"* maddesi, tek başına transaction ile karşılanmaz. İki kullanıcı son kopyayı aynı anda isterse klasik "read-then-write" yarışı oluşur:

```
T1: SELECT availableCopies -> 1
T2: SELECT availableCopies -> 1     <-- ikisi de "stok var" görüyor
T1: UPDATE SET availableCopies = 0
T2: UPDATE SET availableCopies = 0  <-- kayıp güncelleme, stok aslında -1 olmalıydı
```

Çözüm üç katmanlı:

1. **Koşullu atomik UPDATE** — okuma ve yazma tek ifadede:
   ```sql
   UPDATE books SET available_copies = available_copies - 1
   WHERE id = $1 AND available_copies > 0;
   ```
   Etkilenen satır sayısı 0 ise stok tükenmiştir → `BOOK_OUT_OF_STOCK`.

2. **`CHECK (available_copies >= 0)`** — uygulama katmanı hata yapsa bile veritabanı negatif stoğu reddeder (BR-03.2'nin garantisi).

3. **`READ COMMITTED` + transaction** — borrowing satırı ve stok güncellemesi atomik olarak birlikte commit edilir (BR-03.3).

Bu yaklaşım `SELECT ... FOR UPDATE` kilidine göre daha az contention üretir; kilit süresi tek UPDATE ifadesi kadardır.

---

## 5. Şartnamede Belirsiz Bırakılan ve Karara Bağlanan Noktalar

| Konu | Şartname | Alınan karar |
|---|---|---|
| Token ömrü | Belirtilmemiş | Access token 15 dk; refresh token Sprint 2'de opsiyonel |
| İade tarihi | Yok | `dueDate` eklendi, 14 gün (BR-03.6) |
| Gecikme cezası | Yok | Kapsam dışı; `LATE` durumu raporlama için tutulur |
| Ödünç limiti | Yok | Kullanıcı başına 5 aktif kayıt (BR-03.5) |
| Rezervasyon → ödünç geçişi | Yok | İade tetikler, `READY` 3 gün geçerli (BR-04.4/4.5) |
| Stok alanı | İma edilmiş | `totalCopies` + `availableCopies` olarak ikiye ayrıldı |
| Yorum ön koşulu | Yok | Ödünç almış olma şartı **aranmaz** — şartnamede yok |
