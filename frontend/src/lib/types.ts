// Backend sözleşmesinin ayna tipleri. Kaynak: src/modules/**/dto ve
// canlı API çıktısı ile doğrulandı — alan adlarını elle değiştirmeyin.

export type RoleName = 'USER' | 'ADMIN';
export type BorrowingStatus = 'BORROWED' | 'RETURNED' | 'LATE';
export type ReservationStatus =
  | 'PENDING'
  | 'READY'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** "15m" gibi bir süre metni — saniye değil. */
  expiresIn: string;
  user: SessionUser;
}

export interface Book {
  id: number;
  title: string;
  isbn: string | null;
  publishedYear: number | null;
  totalCopies: number;
  availableCopies: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  publisher: { id: number; name: string };
  authors: { id: number; firstName: string; lastName: string }[];
  categories: { id: number; name: string; slug: string }[];
}

export interface Borrowing {
  id: number;
  status: BorrowingStatus;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  user: { id: number; email: string; firstName: string; lastName: string };
  book: { id: number; title: string; isbn: string | null; availableCopies: number };
}

export interface Reservation {
  id: number;
  status: ReservationStatus;
  queuePosition: number;
  reservedAt: string;
  readyUntil: string | null;
  user: { id: number; email: string; firstName: string; lastName: string };
  book: { id: number; title: string; isbn: string | null; availableCopies: number };
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; firstName: string; lastName: string };
  book: { id: number; title: string };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** /api/reviews meta'sına ortalama puanı da ekler. */
export type ReviewList = {
  data: Review[];
  meta: PageMeta & { averageRating: number | null };
};

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** Backend her kategoriye bağlı kitap sayısını da döndürüyor. */
  _count: { bookCategories: number };
}

export interface Author {
  id: number;
  firstName: string;
  lastName: string;
  biography: string | null;
  birthDate: string | null;
  _count: { bookAuthors: number };
}

export interface Publisher {
  id: number;
  name: string;
  website: string | null;
  address: string | null;
  _count: { books: number };
}

/** GET /api/users (ADMIN) — sayfalanmaz, düz dizi döner. */
export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: RoleName[];
  createdAt: string;
}
