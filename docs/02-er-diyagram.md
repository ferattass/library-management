# Sprint 1 — ER Diyagramı

## Genel Görünüm

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "sahiptir"
    ROLES ||--o{ USER_ROLES : "atanır"

    PUBLISHERS ||--o{ BOOKS : "yayınlar"

    BOOKS ||--o{ BOOK_AUTHORS : "yazılır"
    AUTHORS ||--o{ BOOK_AUTHORS : "yazar"

    BOOKS ||--o{ BOOK_CATEGORIES : "sınıflanır"
    CATEGORIES ||--o{ BOOK_CATEGORIES : "içerir"

    USERS ||--o{ BORROWINGS : "ödünç alır"
    BOOKS ||--o{ BORROWINGS : "ödünç verilir"

    USERS ||--o{ RESERVATIONS : "rezerve eder"
    BOOKS ||--o{ RESERVATIONS : "rezerve edilir"

    USERS ||--o{ REVIEWS : "yorumlar"
    BOOKS ||--o{ REVIEWS : "yorumlanır"

    USERS {
        int         id              PK
        varchar     email           UK "citext, benzersiz"
        varchar     password_hash   "bcrypt, cost 12"
        varchar     first_name
        varchar     last_name
        boolean     is_active       "default true"
        timestamptz created_at
        timestamptz updated_at
    }

    ROLES {
        int         id              PK
        role_name   name            UK "USER | ADMIN"
        varchar     description     "nullable"
    }

    USER_ROLES {
        int         user_id         PK,FK
        int         role_id         PK,FK
        timestamptz assigned_at
    }

    AUTHORS {
        int         id              PK
        varchar     first_name
        varchar     last_name
        text        biography       "nullable"
        date        birth_date      "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    CATEGORIES {
        int         id              PK
        varchar     name            UK
        varchar     slug            UK "url-safe"
        text        description     "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    PUBLISHERS {
        int         id              PK
        varchar     name            UK
        varchar     website         "nullable"
        varchar     address         "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    BOOKS {
        int         id                  PK
        varchar     title
        varchar     isbn                UK "nullable, benzersiz"
        int         publisher_id        FK
        smallint    published_year      "nullable"
        int         total_copies        "CHECK >= 0"
        int         available_copies    "CHECK >= 0 AND <= total_copies"
        text        description         "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    BOOK_AUTHORS {
        int         book_id         PK,FK
        int         author_id       PK,FK
    }

    BOOK_CATEGORIES {
        int         book_id         PK,FK
        int         category_id     PK,FK
    }

    BORROWINGS {
        int              id            PK
        int              user_id       FK
        int              book_id       FK
        borrowing_status status        "BORROWED | RETURNED | LATE"
        timestamptz      borrowed_at
        timestamptz      due_date      "borrowed_at + 14g"
        timestamptz      returned_at   "nullable"
        timestamptz      created_at
        timestamptz      updated_at
    }

    RESERVATIONS {
        int                id             PK
        int                user_id        FK
        int                book_id        FK
        reservation_status status         "PENDING | READY | FULFILLED | CANCELLED | EXPIRED"
        int                queue_position "kitap içi sıra no"
        timestamptz        reserved_at
        timestamptz        ready_until    "nullable, READY + 3g"
        timestamptz        created_at
        timestamptz        updated_at
    }

    REVIEWS {
        int         id          PK
        int         user_id     FK
        int         book_id     FK
        smallint    rating      "CHECK 1..5"
        text        comment     "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## İlişki Kardinaliteleri

| İlişki | Tip | Ara Tablo | Silme Davranışı |
|---|---|---|---|
| Users ↔ Roles | M:N | `user_roles` | `CASCADE` (kullanıcı silinince rol ataması gider) |
| Books ↔ Authors | M:N | `book_authors` | `CASCADE` ara tabloda, `RESTRICT` author'da |
| Books ↔ Categories | M:N | `book_categories` | `CASCADE` ara tabloda, `RESTRICT` category'de |
| Publishers → Books | 1:N | — | `RESTRICT` (kitabı olan yayınevi silinemez) |
| Users → Borrowings | 1:N | — | `RESTRICT` (geçmiş kayıt korunur) |
| Books → Borrowings | 1:N | — | `RESTRICT` |
| Users → Reservations | 1:N | — | `CASCADE` |
| Books → Reservations | 1:N | — | `CASCADE` |
| Users → Reviews | 1:N | — | `CASCADE` |
| Books → Reviews | 1:N | — | `CASCADE` |

**Gerekçe:** `borrowings` bir *muhasebe kaydıdır* — kimin neyi ne zaman aldığı geçmişi silinmemelidir, bu yüzden `RESTRICT`. Buna karşılık `reviews` ve `reservations` türev veridir; kullanıcı hesabı silinirse birlikte gitmeleri doğrudur.

---

## Ödünç / Rezervasyon Durum Makineleri

### Borrowing

```mermaid
stateDiagram-v2
    [*] --> BORROWED : POST /borrowings
    BORROWED --> RETURNED : PATCH /:id/return
    BORROWED --> LATE : dueDate geçti (zamanlanmış iş)
    LATE --> RETURNED : PATCH /:id/return
    RETURNED --> [*]
```

### Reservation

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /reservations
    PENDING --> READY : kitap iade edildi, sıra bu kullanıcıda
    PENDING --> CANCELLED : kullanıcı iptal etti
    READY --> FULFILLED : ödünce dönüştü
    READY --> EXPIRED : 3 gün içinde alınmadı
    READY --> CANCELLED : kullanıcı iptal etti
    FULFILLED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
```

`CANCELLED`, `EXPIRED` ve `FULFILLED` **pasif** durumlardır; `PENDING` ve `READY` **aktif**tir. BR-04.1'deki "tekrar rezervasyon yapılamaz" kuralı yalnızca aktif durumlar için geçerlidir — bu yüzden kısmi (partial) unique index kullanılır, bkz. `03-veritabani-tasarimi.md`.
