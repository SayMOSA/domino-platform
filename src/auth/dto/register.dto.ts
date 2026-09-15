import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  nickname: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsOptional()
  avatar?: Express.Multer.File;
}
