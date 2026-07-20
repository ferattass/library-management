import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateReviewDto } from './create-review.dto';

/**
 * `bookId` hariç tutulur — bir yorumun hangi kitaba ait olduğu
 * değiştirilemez. Değişebilseydi "kullanıcı başına kitaba tek yorum"
 * kuralı (BR-05.2) yorumu başka kitaba taşıyarak dolanılabilirdi.
 */
export class UpdateReviewDto extends PartialType(
  OmitType(CreateReviewDto, ['bookId'] as const),
) {}
