import { Transform, Type } from 'class-transformer';
import { NICKNAME_MESSAGE, NICKNAME_PATTERN, cleanNickname } from '../players/nickname';
import {
  IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, Min,
} from 'class-validator';

export class SubmitScoreDto {
  @IsUUID()
  playerId: string;

  @Transform(({ value }) => cleanNickname(value))
  @IsString()
  @Length(2, 24)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname: string;

  @IsString()
  gameSlug: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  points: number;

  @IsOptional()
  @IsBoolean()
  daily?: boolean;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsString()
  game?: string;

  @IsOptional()
  @IsIn(['all', 'week', 'day'])
  period: 'all' | 'week' | 'day' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsUUID()
  playerId?: string;
}
