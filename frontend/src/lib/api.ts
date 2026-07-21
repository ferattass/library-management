import 'server-only';

/**
 * Backend'e yalnızca sunucu tarafından gidilir.
 *
 * Tarayıcı hiçbir zaman NestJS'e doğrudan istek atmaz. İki sebeple:
 * backend'de CORS kapalı (açmak bitmiş sprint kodunu değiştirmek olurdu) ve
 * JWT'yi httpOnly cookie'de tutabilmek için token'ın istemci JavaScript'ine
 * hiç ulaşmaması gerekiyor.
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

export interface ApiErrorBody {
  code: string;
  message: string | string[];
  statusCode: number;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  /** class-validator birden fazla mesaj döndürebildiği için hep dizi. */
  readonly messages: string[];

  constructor(body: ApiErrorBody) {
    const messages = Array.isArray(body.message) ? body.message : [body.message];
    super(messages[0] ?? 'Beklenmeyen bir hata oluştu');
    this.name = 'ApiError';
    this.code = body.code;
    this.statusCode = body.statusCode;
    this.messages = messages;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Varsayılan: önbelleğe alma. Katalog verisi kısa süre tutulabilir. */
  revalidate?: number | false;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, revalidate = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: revalidate === false ? 'no-store' : undefined,
      next: revalidate === false ? undefined : { revalidate },
    });
  } catch {
    // Backend kapalı ya da erişilemiyor — hata gövdesi yok.
    throw new ApiError({
      code: 'BACKEND_UNREACHABLE',
      message: 'API sunucusuna ulaşılamıyor. Backend çalışıyor mu?',
      statusCode: 503,
      timestamp: new Date().toISOString(),
      path,
    });
  }

  // 204 No Content — DELETE ve bazı işlemler gövdesiz döner.
  if (response.status === 204) return null as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (payload && typeof payload === 'object' && 'code' in payload) {
      throw new ApiError(payload as ApiErrorBody);
    }
    throw new ApiError({
      code: 'INTERNAL_ERROR',
      message: `Beklenmeyen yanıt (HTTP ${response.status})`,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      path,
    });
  }

  return payload as T;
}

/** Sorgu dizesini kurarken boş değerleri atar. */
export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
