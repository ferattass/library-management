import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Endpoint'i global JwtAuthGuard'ın dışına çıkarır.
 *
 * Varsayılan "her şey korumalı"dır; bir endpoint'i açmak bilinçli bir karar
 * gerektirir. Tersi (varsayılan açık, korumayı elle eklemek) unutulduğunda
 * sessizce güvenlik açığı üretir.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
