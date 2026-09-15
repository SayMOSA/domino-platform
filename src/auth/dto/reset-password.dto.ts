import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty()
    @IsEmail()
    email: string;
}