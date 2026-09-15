import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString , IsNotEmpty,Length} from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @Length(5,50)
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(8,24)
  password: string;
}
