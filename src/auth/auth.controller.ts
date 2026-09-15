import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, ResendOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AdminGuard } from 'src/common/guards/is-admin.guards';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth/refresh',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create player account & optionally upload avatar to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    let avatar: { url: string; publicId: string } | undefined;
    if (avatarFile) {
      const uploaded = await this.cloudinaryService.uploadImage(avatarFile);
      avatar = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }
    return this.authService.register(dto, avatar);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Confirm email using the OTP token , send newPassword if provided' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp, dto.newPassword);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend the email verification OTP , or send otp to reset password' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate player & return access tokens , refresh token in cookie' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, player } = await this.authService.login(dto);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    return { accessToken, player };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiOperation({ summary: 'Change player password' })
  changePassword(
    @CurrentUser('sub') playerId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(playerId, dto.newPassword , dto.oldPassword);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Issue a new access token' })
  async refresh(
    @Req() req: Request & { user: { sub: string; refreshToken: string } },
    @Res({ passthrough: true }) res: Response
  ) {
    const { sub, refreshToken } = req.user;

    const tokens = await this.authService.refresh(sub, refreshToken);
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS);
    return { accessToken : tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the active refresh token' })
  async logout(
    @CurrentUser('sub') playerId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return this.authService.logout(playerId);
  }

  @UseGuards(AdminGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset player password' })
  resetPassword(@Body() dto : ResetPasswordDto) {
    return this.authService.resetPassword(dto.email);
  }

  @UseGuards(AdminGuard)
  @Post('give-admin-role')
  @ApiOperation({ summary: 'Give player admin role' })
  giveAdminRole(@CurrentUser('sub') playerId: string) {
    return this.authService.giveAdminRole(playerId);
  }
}
