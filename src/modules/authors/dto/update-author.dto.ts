import { PartialType } from '@nestjs/swagger';

import { CreateAuthorDto } from './create-author.dto';

/** Tüm alanlar opsiyonel — kısmi güncelleme (PATCH). */
export class UpdateAuthorDto extends PartialType(CreateAuthorDto) {}
