import { IsOptional, IsString, IsMongoId, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class MatchQueryDto {
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @IsOptional()
  @IsMongoId()
  playerId?: string;

  @IsOptional()
  @IsIn(['winner', 'loser', 'any'])
  @Transform(({ value }) => value || 'any')
  playerStatus: 'winner' | 'loser' | 'any' = 'any';
}