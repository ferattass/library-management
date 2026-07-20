import { PartialType } from '@nestjs/swagger';

import { CreateBookDto } from './create-book.dto';

/**
 * Tüm alanlar opsiyonel. `authorIds` / `categoryIds` gönderilirse mevcut
 * ilişkilerin **yerini alır** (ekleme değil, değiştirme); gönderilmezse
 * mevcut ilişkiler korunur.
 */
export class UpdateBookDto extends PartialType(CreateBookDto) {}
