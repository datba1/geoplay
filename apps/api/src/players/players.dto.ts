import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateNicknameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 24)
  @Matches(/^[\p{L}\p{N} _.\-]+$/u, { message: 'nickname contains invalid characters' })
  nickname: string;
}
