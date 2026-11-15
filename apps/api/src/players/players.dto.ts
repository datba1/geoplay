import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { NICKNAME_MESSAGE, NICKNAME_PATTERN, cleanNickname } from './nickname';

export class UpdateNicknameDto {
  @Transform(({ value }) => cleanNickname(value))
  @IsString()
  @Length(2, 24)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname: string;
}
