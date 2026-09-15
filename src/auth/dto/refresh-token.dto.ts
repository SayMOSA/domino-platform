import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// refreshToken is optional in the body because it is normally read from the HttpOnly cookie instead.
export class RefreshTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
