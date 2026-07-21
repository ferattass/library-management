import 'server-only';

import { apiRequest, toQuery } from './api';
import { getToken } from './session';
import type {
  Book,
  Borrowing,
  Category,
  Paginated,
  Reservation,
  ReviewList,
} from './types';

export interface CatalogSearch {
  page?: string;
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const SORT_OPTIONS = [
  { value: 'title', label: 'Başlık' },
  { value: 'publishedYear', label: 'Yayın yılı' },
  { value: 'availableCopies', label: 'Raftaki kopya' },
  { value: 'createdAt', label: 'Eklenme tarihi' },
] as const;

const ALLOWED_SORT = new Set(SORT_OPTIONS.map((o) => o.value as string));

export async function getBooks(params: CatalogSearch): Promise<Paginated<Book>> {
  const page = Number(params.page ?? '1');
  // sortBy beyaz listesi backend'de de var; burada da süzüyoruz ki
  // elle düzenlenmiş bir URL 400 yerine makul bir sayfa göstersin.
  const sortBy = params.sortBy && ALLOWED_SORT.has(params.sortBy) ? params.sortBy : 'title';
  const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';

  return apiRequest<Paginated<Book>>(
    `/books${toQuery({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: 12,
      search: params.search,
      category: params.category,
      sortBy,
      sortOrder,
    })}`,
  );
}

export async function getBook(id: number): Promise<Book> {
  return apiRequest<Book>(`/books/${id}`);
}

export async function getCategories(): Promise<Category[]> {
  // Katalog filtresini beslediği için kısa süre önbelleklenebilir.
  return apiRequest<Category[]>('/categories', { revalidate: 60 });
}

export async function getBookReviews(bookId: number): Promise<ReviewList> {
  return apiRequest<ReviewList>(
    `/reviews${toQuery({ bookId, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })}`,
  );
}

export async function getMyBorrowings(): Promise<Paginated<Borrowing> | null> {
  const token = await getToken();
  if (!token) return null;
  return apiRequest<Paginated<Borrowing>>(`/borrowings${toQuery({ limit: 50 })}`, { token });
}

export async function getMyReservations(): Promise<Paginated<Reservation> | null> {
  const token = await getToken();
  if (!token) return null;
  return apiRequest<Paginated<Reservation>>(`/reservations${toQuery({ limit: 50 })}`, { token });
}
