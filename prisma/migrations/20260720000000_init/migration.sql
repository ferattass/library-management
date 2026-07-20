-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "role_name" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "borrowing_status" AS ENUM ('BORROWED', 'RETURNED', 'LATE');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('PENDING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(72) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" "role_name" NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "biography" TEXT,
    "birth_date" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "website" VARCHAR(255),
    "address" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "isbn" VARCHAR(20),
    "publisher_id" INTEGER NOT NULL,
    "published_year" SMALLINT,
    "total_copies" INTEGER NOT NULL DEFAULT 0,
    "available_copies" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_authors" (
    "book_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "book_authors_pkey" PRIMARY KEY ("book_id","author_id")
);

-- CreateTable
CREATE TABLE "book_categories" (
    "book_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("book_id","category_id")
);

-- CreateTable
CREATE TABLE "borrowings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "book_id" INTEGER NOT NULL,
    "status" "borrowing_status" NOT NULL DEFAULT 'BORROWED',
    "borrowed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "returned_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "borrowings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "book_id" INTEGER NOT NULL,
    "status" "reservation_status" NOT NULL DEFAULT 'PENDING',
    "queue_position" INTEGER NOT NULL,
    "reserved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "book_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_name_key" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_publisher_id_idx" ON "books"("publisher_id");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "book_authors_author_id_idx" ON "book_authors"("author_id");

-- CreateIndex
CREATE INDEX "book_categories_category_id_idx" ON "book_categories"("category_id");

-- CreateIndex
CREATE INDEX "borrowings_user_id_idx" ON "borrowings"("user_id");

-- CreateIndex
CREATE INDEX "borrowings_book_id_idx" ON "borrowings"("book_id");

-- CreateIndex
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");

-- CreateIndex
CREATE INDEX "reservations_book_id_idx" ON "reservations"("book_id");

-- CreateIndex
CREATE INDEX "reviews_book_id_idx" ON "reviews"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_book_id_key" ON "reviews"("user_id", "book_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- MANUEL DDL
-- Buradan aşağısı Prisma şema DSL'i ile ifade edilemeyen kısıtlardır ve
-- elle yazılmıştır. Gerekçeleri: docs/03-veritabani-tasarimi.md §5-6.
-- Sonraki `prisma migrate dev` çıktılarında bunların DROP edilmediğini
-- kontrol edin (bkz. README "Migration notu").
-- =====================================================================

-- ---------- CHECK kısıtları (§6) ----------

-- BR-03.2 — stok asla negatif olamaz. Şartnamenin en kritik maddesi;
-- uygulama katmanı hata yapsa bile veritabanı bunu reddeder.
ALTER TABLE "books" ADD CONSTRAINT "books_available_copies_non_negative"
  CHECK ("available_copies" >= 0);

-- BR-02.6
ALTER TABLE "books" ADD CONSTRAINT "books_total_copies_non_negative"
  CHECK ("total_copies" >= 0);
ALTER TABLE "books" ADD CONSTRAINT "books_available_lte_total"
  CHECK ("available_copies" <= "total_copies");

-- BR-05.1 — puan 1-5 aralığında
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range"
  CHECK ("rating" BETWEEN 1 AND 5);

-- Mantıksal tutarlılık: iade tarihi ödünç tarihinden sonra olmalı
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_due_after_borrowed"
  CHECK ("due_date" > "borrowed_at");

-- status ile returned_at birbiriyle çelişemez:
-- "RETURNED ama returned_at NULL" veya tersi bir satır oluşturulamaz.
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_returned_status_consistent"
  CHECK (("status" = 'RETURNED') = ("returned_at" IS NOT NULL));

-- BR-04.5 — READY durumundaki rezervasyonun son alma tarihi olmalı
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ready_until_consistent"
  CHECK ("status" <> 'READY' OR "ready_until" IS NOT NULL);

-- ---------- Kısmi UNIQUE index (§4) ----------

-- BR-04.1 — aynı kullanıcı aynı kitap için ikinci bir AKTİF rezervasyon
-- oluşturamaz. Kısmi olması şart: aksi halde iptal edilmiş bir rezervasyon
-- kullanıcıyı o kitaptan ömür boyu men ederdi.
CREATE UNIQUE INDEX "reservations_active_user_book_uniq"
  ON "reservations" ("user_id", "book_id")
  WHERE "status" IN ('PENDING', 'READY');

-- ---------- Kısmi index'ler (§5.4) ----------

-- BR-03.4 / BR-03.5 — kullanıcının aktif ödünç kayıtları
CREATE INDEX "borrowings_active_idx" ON "borrowings" ("user_id", "book_id")
  WHERE "status" IN ('BORROWED', 'LATE');

-- BR-04.2 — kitabın rezervasyon kuyruğu, FIFO sırasında
CREATE INDEX "reservations_queue_idx" ON "reservations" ("book_id", "queue_position")
  WHERE "status" = 'PENDING';

-- BR-03.1 — stokta olan kitaplar
CREATE INDEX "books_available_idx" ON "books" ("id")
  WHERE "available_copies" > 0;

-- ---------- Arama ve sıralama index'leri (§5.2-5.3) ----------

-- Sprint 4: GET /books?search=harry
-- ILIKE '%harry%' baştaki joker yüzünden B-tree kullanamaz; trigram GIN gerekir.
CREATE INDEX "books_title_trgm_idx" ON "books"
  USING GIN ("title" gin_trgm_ops);

CREATE INDEX "authors_name_trgm_idx" ON "authors"
  USING GIN (("first_name" || ' ' || "last_name") gin_trgm_ops);

-- Sprint 4: GET /books?sortBy=publishedYear
CREATE INDEX "books_published_year_idx" ON "books" ("published_year" DESC NULLS LAST);
