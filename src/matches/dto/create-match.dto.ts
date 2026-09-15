import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { MatchType } from '../schemas/match.schema';

export class CreateMatchDto {
  @ApiProperty({ enum: MatchType })
  @IsEnum(MatchType)
  @IsNotEmpty()
  matchType: MatchType;

  @ApiProperty({ type: [String], description: 'Player IDs on the winning side' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsMongoId({ each: true })
  @IsNotEmpty()
  winningTeam: string[];

  @ApiProperty({ type: [String], description: 'Player IDs on the losing side' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsNotEmpty()
  @IsMongoId({ each: true })
  losingTeam: string[];

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  winningPoints: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  losingPoints: number;
}
