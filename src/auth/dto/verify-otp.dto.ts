import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length , IsNotEmpty , IsOptional} from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '6-digit OTP sent to the player email' })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otp: string;

  @ApiProperty()
  @IsString()
  @Length(8, 24)
  @IsOptional()
  newPassword: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
