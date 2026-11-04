// Demo veri seed'i — canlı ortamı tanıtım için gerçekçi verilerle doldurur.
// Temel seed'in (roller + admin) üzerine kurulur; kendi başına da çalışır.
// Tüm kayıtlar upsert/guard ile eklenir: script tekrar çalıştırılabilir.
//
//   DATABASE_URL="postgresql://..." npx ts-node prisma/seed-demo.ts

import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { BorrowingStatus, PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

// --------------------------------------------------------------- veriler

const CATEGORIES = [
  { name: 'Roman', slug: 'roman' },
  { name: 'Öykü', slug: 'oyku' },
  { name: 'Şiir', slug: 'siir' },
  { name: 'Bilim Kurgu', slug: 'bilim-kurgu' },
  { name: 'Polisiye', slug: 'polisiye' },
  { name: 'Tarih', slug: 'tarih' },
  { name: 'Fantastik', slug: 'fantastik' },
  { name: 'Çocuk', slug: 'cocuk' },
];

const PUBLISHERS = [
  { name: 'Can Yayınları', website: 'https://canyayinlari.com' },
  { name: 'Yapı Kredi Yayınları', website: 'https://www.ykykultur.com.tr' },
  { name: 'İletişim Yayınları', website: 'https://iletisim.com.tr' },
  { name: 'İş Bankası Kültür Yayınları', website: 'https://www.iskultur.com.tr' },
  { name: 'Doğan Kitap', website: 'https://www.dogankitap.com.tr' },
  { name: 'İthaki Yayınları', website: 'https://ithaki.com.tr' },
];

const AUTHORS = [
  { firstName: 'Sabahattin', lastName: 'Ali' },
  { firstName: 'Orhan', lastName: 'Pamuk' },
  { firstName: 'Yaşar', lastName: 'Kemal' },
  { firstName: 'Ahmet Hamdi', lastName: 'Tanpınar' },
  { firstName: 'Oğuz', lastName: 'Atay' },
  { firstName: 'Sait Faik', lastName: 'Abasıyanık' },
  { firstName: 'Nâzım', lastName: 'Hikmet' },
  { firstName: 'George', lastName: 'Orwell' },
  { firstName: 'Aldous', lastName: 'Huxley' },
  { firstName: 'Fyodor', lastName: 'Dostoyevski' },
  { firstName: 'Lev', lastName: 'Tolstoy' },
  { firstName: 'Franz', lastName: 'Kafka' },
  { firstName: 'Stefan', lastName: 'Zweig' },
  { firstName: 'Gabriel', lastName: 'García Márquez' },
  { firstName: 'Agatha', lastName: 'Christie' },
  { firstName: 'Frank', lastName: 'Herbert' },
  { firstName: 'Yuval Noah', lastName: 'Harari' },
  { firstName: 'Reşat Nuri', lastName: 'Güntekin' },
  { firstName: 'Halide Edib', lastName: 'Adıvar' },
  { firstName: 'Peyami', lastName: 'Safa' },
  { firstName: 'Kemal', lastName: 'Tahir' },
  { firstName: 'Zülfü', lastName: 'Livaneli' },
  { firstName: 'Elif', lastName: 'Şafak' },
  { firstName: 'İhsan Oktay', lastName: 'Anar' },
  { firstName: 'Victor', lastName: 'Hugo' },
  { firstName: 'Jane', lastName: 'Austen' },
  { firstName: 'Ernest', lastName: 'Hemingway' },
  { firstName: 'John', lastName: 'Steinbeck' },
  { firstName: 'Albert', lastName: 'Camus' },
  { firstName: 'Hermann', lastName: 'Hesse' },
  { firstName: 'Antoine de', lastName: 'Saint-Exupéry' },
  { firstName: 'J.R.R.', lastName: 'Tolkien' },
  { firstName: 'Ray', lastName: 'Bradbury' },
  { firstName: 'Isaac', lastName: 'Asimov' },
  { firstName: 'Umberto', lastName: 'Eco' },
  { firstName: 'Mihail', lastName: 'Bulgakov' },
];

// author/publisher alanları yukarıdaki listelerin "Ad Soyad" / isim karşılığıdır.
const BOOKS: {
  title: string;
  isbn: string;
  author: string;
  publisher: string;
  category: string;
  year: number;
  copies: number;
  description: string;
}[] = [
  {
    title: 'Kürk Mantolu Madonna',
    isbn: '978-975-08-0921-6',
    author: 'Sabahattin Ali',
    publisher: 'Yapı Kredi Yayınları',
    category: 'Roman',
    year: 1943,
    copies: 5,
    description: 'Raif Efendi ile Maria Puder\'in Berlin\'de başlayan hikâyesi.',
  },
  {
    title: 'İçimizdeki Şeytan',
    isbn: '978-975-08-0339-9',
    author: 'Sabahattin Ali',
    publisher: 'Yapı Kredi Yayınları',
    category: 'Roman',
    year: 1940,
    copies: 3,
    description: 'İstanbul Üniversitesi çevresinde geçen bir aydın eleştirisi.',
  },
  {
    title: 'Masumiyet Müzesi',
    isbn: '978-975-05-0609-2',
    author: 'Orhan Pamuk',
    publisher: 'İletişim Yayınları',
    category: 'Roman',
    year: 2008,
    copies: 4,
    description: 'Kemal ile Füsun\'un nesneler üzerinden anlatılan aşkı.',
  },
  {
    title: 'Kar',
    isbn: '978-975-05-0129-5',
    author: 'Orhan Pamuk',
    publisher: 'İletişim Yayınları',
    category: 'Roman',
    year: 2002,
    copies: 3,
    description: 'Şair Ka\'nın Kars\'ta geçirdiği üç gün.',
  },
  {
    title: 'İnce Memed',
    isbn: '978-975-08-2427-1',
    author: 'Yaşar Kemal',
    publisher: 'Yapı Kredi Yayınları',
    category: 'Roman',
    year: 1955,
    copies: 4,
    description: 'Toroslar\'da bir eşkıyalık ve başkaldırı destanı.',
  },
  {
    title: 'Saatleri Ayarlama Enstitüsü',
    isbn: '978-975-08-2632-9',
    author: 'Ahmet Hamdi Tanpınar',
    publisher: 'Yapı Kredi Yayınları',
    category: 'Roman',
    year: 1961,
    copies: 3,
    description: 'Hayri İrdal\'ın gözünden modernleşme hicvi.',
  },
  {
    title: 'Tutunamayanlar',
    isbn: '978-975-05-0004-5',
    author: 'Oğuz Atay',
    publisher: 'İletişim Yayınları',
    category: 'Roman',
    year: 1972,
    copies: 3,
    description: 'Selim Işık\'ın izinde bir "tutunamama" anlatısı.',
  },
  {
    title: 'Semaver',
    isbn: '978-605-332-055-3',
    author: 'Sait Faik Abasıyanık',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Öykü',
    year: 1936,
    copies: 2,
    description: 'Sait Faik\'in ilk öykü kitabı.',
  },
  {
    title: 'Memleketimden İnsan Manzaraları',
    isbn: '978-975-08-0322-1',
    author: 'Nâzım Hikmet',
    publisher: 'Yapı Kredi Yayınları',
    category: 'Şiir',
    year: 1966,
    copies: 2,
    description: 'Destansı şiir; bir dönemin insan panoraması.',
  },
  {
    title: '1984',
    isbn: '978-975-07-3848-4',
    author: 'George Orwell',
    publisher: 'Can Yayınları',
    category: 'Bilim Kurgu',
    year: 1949,
    copies: 6,
    description: 'Büyük Birader\'in gözetim distopyası.',
  },
  {
    title: 'Hayvan Çiftliği',
    isbn: '978-975-07-0575-2',
    author: 'George Orwell',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1945,
    copies: 4,
    description: 'Bir çiftlikte devrimin alegorisi.',
  },
  {
    title: 'Cesur Yeni Dünya',
    isbn: '978-975-07-3970-2',
    author: 'Aldous Huxley',
    publisher: 'Can Yayınları',
    category: 'Bilim Kurgu',
    year: 1932,
    copies: 3,
    description: 'Konfor ve koşullandırma üzerine kurulu bir distopya.',
  },
  {
    title: 'Suç ve Ceza',
    isbn: '978-605-332-020-1',
    author: 'Fyodor Dostoyevski',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1866,
    copies: 5,
    description: 'Raskolnikov\'un vicdanıyla hesaplaşması.',
  },
  {
    title: 'Karamazov Kardeşler',
    isbn: '978-605-332-346-2',
    author: 'Fyodor Dostoyevski',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1880,
    copies: 3,
    description: 'İnanç, ahlak ve baba-oğul çatışması.',
  },
  {
    title: 'Anna Karenina',
    isbn: '978-605-332-107-9',
    author: 'Lev Tolstoy',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1877,
    copies: 3,
    description: '"Bütün mutlu aileler birbirine benzer..."',
  },
  {
    title: 'Dönüşüm',
    isbn: '978-975-07-2088-5',
    author: 'Franz Kafka',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1915,
    copies: 4,
    description: 'Gregor Samsa bir sabah böceğe dönüşmüş olarak uyanır.',
  },
  {
    title: 'Satranç',
    isbn: '978-605-332-171-0',
    author: 'Stefan Zweig',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Öykü',
    year: 1942,
    copies: 4,
    description: 'Bir gemi yolculuğunda saplantıya dönüşen satranç.',
  },
  {
    title: 'Yüzyıllık Yalnızlık',
    isbn: '978-975-07-0651-3',
    author: 'Gabriel García Márquez',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1967,
    copies: 3,
    description: 'Macondo\'da Buendía ailesinin yedi kuşağı.',
  },
  {
    title: 'Doğu Ekspresinde Cinayet',
    isbn: '978-605-09-2611-7',
    author: 'Agatha Christie',
    publisher: 'Doğan Kitap',
    category: 'Polisiye',
    year: 1934,
    copies: 4,
    description: 'Hercule Poirot karda mahsur kalan trende bir cinayeti çözer.',
  },
  {
    title: 'Dune',
    isbn: '978-605-09-5474-5',
    author: 'Frank Herbert',
    publisher: 'Doğan Kitap',
    category: 'Bilim Kurgu',
    year: 1965,
    copies: 3,
    description: 'Çöl gezegeni Arrakis ve baharatın hikâyesi.',
  },
  {
    title: 'Sapiens: İnsan Türünün Kısa Bir Tarihi',
    isbn: '978-605-09-2262-1',
    author: 'Yuval Noah Harari',
    publisher: 'Doğan Kitap',
    category: 'Tarih',
    year: 2011,
    copies: 4,
    description: 'Bilişsel devrimden bugüne insanlığın öyküsü.',
  },
  {
    title: 'Çalıkuşu',
    isbn: '978-605-332-471-1',
    author: 'Reşat Nuri Güntekin',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1922,
    copies: 4,
    description: 'Feride\'nin Anadolu\'ya uzanan öğretmenlik yolculuğu.',
  },
  {
    title: 'Sinekli Bakkal',
    isbn: '978-975-07-1633-8',
    author: 'Halide Edib Adıvar',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1936,
    copies: 3,
    description: 'II. Abdülhamid dönemi İstanbul\'unda Rabia\'nın hikâyesi.',
  },
  {
    title: 'Dokuzuncu Hariciye Koğuşu',
    isbn: '978-975-07-4102-6',
    author: 'Peyami Safa',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1930,
    copies: 3,
    description: 'Hasta bir gencin iç dünyasına yolculuk.',
  },
  {
    title: 'Devlet Ana',
    isbn: '978-605-375-128-9',
    author: 'Kemal Tahir',
    publisher: 'İthaki Yayınları',
    category: 'Roman',
    year: 1967,
    copies: 2,
    description: 'Osmanlı\'nın kuruluş dönemine dair bir roman.',
  },
  {
    title: 'Serenad',
    isbn: '978-605-09-0641-6',
    author: 'Zülfü Livaneli',
    publisher: 'Doğan Kitap',
    category: 'Roman',
    year: 2011,
    copies: 4,
    description: 'Maya\'nın peşine düştüğü, savaşla kesişen bir aşk hikâyesi.',
  },
  {
    title: 'Aşk',
    isbn: '978-605-09-1462-6',
    author: 'Elif Şafak',
    publisher: 'Doğan Kitap',
    category: 'Roman',
    year: 2009,
    copies: 4,
    description: 'Mevlâna ile Şems\'in dostluğu ve Ella\'nın uyanışı.',
  },
  {
    title: 'Puslu Kıtalar Atlası',
    isbn: '978-975-05-0092-2',
    author: 'İhsan Oktay Anar',
    publisher: 'İletişim Yayınları',
    category: 'Fantastik',
    year: 1995,
    copies: 3,
    description: 'Galata\'da rüyalarla gerçek arasında bir 17. yüzyıl masalı.',
  },
  {
    title: 'Sefiller',
    isbn: '978-605-332-249-6',
    author: 'Victor Hugo',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1862,
    copies: 3,
    description: 'Jean Valjean\'ın vicdan ve adalet mücadelesi.',
  },
  {
    title: 'Gurur ve Önyargı',
    isbn: '978-975-07-2412-8',
    author: 'Jane Austen',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1813,
    copies: 3,
    description: 'Elizabeth Bennet ile Bay Darcy\'nin inatlaşması.',
  },
  {
    title: 'İhtiyar Adam ve Deniz',
    isbn: '978-975-07-4471-3',
    author: 'Ernest Hemingway',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1952,
    copies: 3,
    description: 'Yaşlı balıkçı Santiago\'nun büyük balıkla mücadelesi.',
  },
  {
    title: 'Fareler ve İnsanlar',
    isbn: '978-605-332-380-6',
    author: 'John Steinbeck',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1937,
    copies: 4,
    description: 'George ile Lennie\'nin bir çiftlik hayali.',
  },
  {
    title: 'Yabancı',
    isbn: '978-975-07-0716-9',
    author: 'Albert Camus',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1942,
    copies: 4,
    description: 'Meursault\'nun kayıtsızlığı üzerinden absürdün romanı.',
  },
  {
    title: 'Siddhartha',
    isbn: '978-975-07-1738-0',
    author: 'Hermann Hesse',
    publisher: 'Can Yayınları',
    category: 'Roman',
    year: 1922,
    copies: 2,
    description: 'Bir arayışın ve aydınlanmanın öyküsü.',
  },
  {
    title: 'Küçük Prens',
    isbn: '978-975-07-2517-0',
    author: 'Antoine de Saint-Exupéry',
    publisher: 'Can Yayınları',
    category: 'Çocuk',
    year: 1943,
    copies: 6,
    description: 'Gezegenini bırakıp yola çıkan küçük bir prensin masalı.',
  },
  {
    title: 'Hobbit',
    isbn: '978-605-375-064-0',
    author: 'J.R.R. Tolkien',
    publisher: 'İthaki Yayınları',
    category: 'Fantastik',
    year: 1937,
    copies: 4,
    description: 'Bilbo Baggins\'in beklenmedik macerası.',
  },
  {
    title: 'Fahrenheit 451',
    isbn: '978-605-375-238-5',
    author: 'Ray Bradbury',
    publisher: 'İthaki Yayınları',
    category: 'Bilim Kurgu',
    year: 1953,
    copies: 3,
    description: 'Kitapların yakıldığı bir gelecekte bir itfaiyecinin uyanışı.',
  },
  {
    title: 'Vakıf',
    isbn: '978-605-375-317-7',
    author: 'Isaac Asimov',
    publisher: 'İthaki Yayınları',
    category: 'Bilim Kurgu',
    year: 1951,
    copies: 3,
    description: 'Galaktik imparatorluğun çöküşü ve psikotarih.',
  },
  {
    title: 'Gülün Adı',
    isbn: '978-975-07-0384-0',
    author: 'Umberto Eco',
    publisher: 'Can Yayınları',
    category: 'Polisiye',
    year: 1980,
    copies: 2,
    description: 'Bir manastırda yedi günde çözülen cinayetler.',
  },
  {
    title: 'Usta ile Margarita',
    isbn: '978-605-332-524-4',
    author: 'Mihail Bulgakov',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Fantastik',
    year: 1967,
    copies: 3,
    description: 'Şeytan Moskova\'ya gelirse ne olur?',
  },
  {
    title: 'Budala',
    isbn: '978-605-332-118-5',
    author: 'Fyodor Dostoyevski',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Roman',
    year: 1869,
    copies: 3,
    description: 'Prens Mışkin\'in saf iyiliğinin toplumla imtihanı.',
  },
  {
    title: 'Bilinmeyen Bir Kadının Mektubu',
    isbn: '978-605-332-090-4',
    author: 'Stefan Zweig',
    publisher: 'İş Bankası Kültür Yayınları',
    category: 'Öykü',
    year: 1922,
    copies: 3,
    description: 'Tek taraflı bir aşkın mektupla itirafı.',
  },
];

const DEMO_PASSWORD = 'Uye2026!';
const USERS = [
  { email: 'ayse.yilmaz@ornek.com', firstName: 'Ayşe', lastName: 'Yılmaz' },
  { email: 'mehmet.demir@ornek.com', firstName: 'Mehmet', lastName: 'Demir' },
  { email: 'zeynep.kaya@ornek.com', firstName: 'Zeynep', lastName: 'Kaya' },
  { email: 'can.ozturk@ornek.com', firstName: 'Can', lastName: 'Öztürk' },
];

const REVIEWS: { user: string; isbn: string; rating: number; comment: string }[] = [
  { user: 'ayse.yilmaz@ornek.com', isbn: '978-975-08-0921-6', rating: 5, comment: 'Tek oturuşta bitirdim, sonu içimi sızlattı.' },
  { user: 'mehmet.demir@ornek.com', isbn: '978-975-08-0921-6', rating: 4, comment: 'Dili çok akıcı, herkese öneririm.' },
  { user: 'zeynep.kaya@ornek.com', isbn: '978-975-07-3848-4', rating: 5, comment: 'Her okuyuşta başka bir ayrıntı yakalıyorum.' },
  { user: 'can.ozturk@ornek.com', isbn: '978-975-07-3848-4', rating: 4, comment: 'Günümüzü anlatıyor sanki.' },
  { user: 'ayse.yilmaz@ornek.com', isbn: '978-605-332-020-1', rating: 5, comment: 'Klasiklerin klasiği; çeviri de çok başarılı.' },
  { user: 'mehmet.demir@ornek.com', isbn: '978-605-09-5474-5', rating: 5, comment: 'Bilim kurgunun zirvesi.' },
  { user: 'zeynep.kaya@ornek.com', isbn: '978-605-332-171-0', rating: 4, comment: 'İnce ama çok yoğun bir kitap.' },
  { user: 'can.ozturk@ornek.com', isbn: '978-605-09-2262-1', rating: 4, comment: 'Ufuk açıcı; bazı bölümler tartışmalı olsa da.' },
];

// Aktif ödünçler availableCopies'i düşürür; iade edilmişler düşürmez (BR-03.2).
const BORROWINGS: { user: string; isbn: string; daysLeft: number; returned: boolean }[] = [
  { user: 'ayse.yilmaz@ornek.com', isbn: '978-975-07-3848-4', daysLeft: 10, returned: false },
  { user: 'zeynep.kaya@ornek.com', isbn: '978-605-09-5474-5', daysLeft: 5, returned: false },
  { user: 'mehmet.demir@ornek.com', isbn: '978-975-08-0921-6', daysLeft: -3, returned: true },
];

// --------------------------------------------------------------- seed

async function main(): Promise<void> {
  // Roller — temel seed çalışmamışsa da ayakta kalalım.
  for (const name of [RoleName.USER, RoleName.ADMIN]) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const userRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.USER } });

  // Üyeler
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, ROUNDS);
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
      update: {},
      create: { userId: user.id, roleId: userRole.id },
    });
  }
  console.log(`✔ ${USERS.length} üye hazır (şifre: ${DEMO_PASSWORD})`);

  // Kategoriler & yayınevleri
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  for (const p of PUBLISHERS) {
    await prisma.publisher.upsert({ where: { name: p.name }, update: {}, create: p });
  }
  console.log(`✔ ${CATEGORIES.length} kategori, ${PUBLISHERS.length} yayınevi hazır`);

  // Yazarlar — benzersiz alan yok, ad+soyad ile guard'lanır.
  for (const a of AUTHORS) {
    const existing = await prisma.author.findFirst({
      where: { firstName: a.firstName, lastName: a.lastName },
    });
    if (!existing) await prisma.author.create({ data: a });
  }
  console.log(`✔ ${AUTHORS.length} yazar hazır`);

  // Kitaplar
  for (const b of BOOKS) {
    // "Ad Soyad" metnini AUTHORS listesindeki kayda çevir — iki kelimeli
    // ad/soyadlar (Ahmet Hamdi, García Márquez) split ile ayrıştırılamaz.
    const meta = AUTHORS.find((a) => `${a.firstName} ${a.lastName}` === b.author);
    if (!meta) throw new Error(`Yazar listede yok: ${b.author}`);
    const author = await prisma.author.findFirst({ where: meta });
    if (!author) throw new Error(`Yazar bulunamadı: ${b.author}`);

    const publisher = await prisma.publisher.findUniqueOrThrow({ where: { name: b.publisher } });
    const category = await prisma.category.findUniqueOrThrow({ where: { name: b.category } });

    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {},
      create: {
        title: b.title,
        isbn: b.isbn,
        publisherId: publisher.id,
        publishedYear: b.year,
        totalCopies: b.copies,
        availableCopies: b.copies,
        description: b.description,
      },
    });
    await prisma.bookAuthor.upsert({
      where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
      update: {},
      create: { bookId: book.id, authorId: author.id },
    });
    await prisma.bookCategory.upsert({
      where: { bookId_categoryId: { bookId: book.id, categoryId: category.id } },
      update: {},
      create: { bookId: book.id, categoryId: category.id },
    });
  }
  console.log(`✔ ${BOOKS.length} kitap hazır`);

  // Yorumlar
  for (const r of REVIEWS) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: r.user } });
    const book = await prisma.book.findUniqueOrThrow({ where: { isbn: r.isbn } });
    await prisma.review.upsert({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
      update: {},
      create: { userId: user.id, bookId: book.id, rating: r.rating, comment: r.comment },
    });
  }
  console.log(`✔ ${REVIEWS.length} yorum hazır`);

  // Ödünçler — tekrar çalıştırmada çift kayıt/çift düşüm olmasın diye guard'lı.
  for (const brw of BORROWINGS) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: brw.user } });
    const book = await prisma.book.findUniqueOrThrow({ where: { isbn: brw.isbn } });

    const existing = await prisma.borrowing.findFirst({
      where: { userId: user.id, bookId: book.id },
    });
    if (existing) continue;

    const now = Date.now();
    const dueDate = new Date(now + brw.daysLeft * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.borrowing.create({
        data: {
          userId: user.id,
          bookId: book.id,
          status: brw.returned ? BorrowingStatus.RETURNED : BorrowingStatus.BORROWED,
          borrowedAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
          dueDate,
          returnedAt: brw.returned ? new Date(now - 4 * 24 * 60 * 60 * 1000) : null,
        },
      });
      if (!brw.returned) {
        await tx.book.update({
          where: { id: book.id },
          data: { availableCopies: { decrement: 1 } },
        });
      }
    });
  }
  console.log(`✔ ${BORROWINGS.length} ödünç kaydı hazır`);
}

main()
  .catch((error: unknown) => {
    console.error('Demo seed başarısız:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
