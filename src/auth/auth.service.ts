import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { sendEmail } from '../common/utils/send-email.util';
import { Player, PlayerDocument, PlayerRole } from '../players/schemas/player.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PlayerSeasonStats, PlayerSeasonStatsDocument } from 'src/matches/schemas/stats.schema';

const SALT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(PlayerSeasonStats.name) private statsModel: Model<PlayerSeasonStatsDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }


  async register(dto: RegisterDto, avatar?: { url: string; publicId: string }) {
    const existing = await this.playerModel.findOne({
      $or: [{ email: dto.email }, { nickname: dto.nickname }],
    });
    if (existing) {
      throw new ConflictException('Email or nickname already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { otp, hashedOtp, expiresAt } = await this.generateOtp();


    try {

      await sendEmail({
        email: dto.email,
        subject: 'Verify your email address',
        message: `verification code: ${otp} (valid for 10 minutes)`,
      });

      const player = await this.playerModel.create({
        name: dto.name,
        nickname: dto.nickname,
        email: dto.email,
        passwordHash,
        verificationOtp: hashedOtp,
        otpExpiresAt: expiresAt,
        avatarUrl: avatar?.url,
        avatarPublicId: avatar?.publicId,
      });

      const seasonId = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      await this.statsModel.create({
        playerId: player._id,
        seasonId,
      });

      return {
        message: 'Registration successful. Please verify your email with the OTP sent.',
        playerId: player._id
      };
    } catch (err: unknown) {

      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }
  }

  async verifyOtp(email: string, otp: string, newPassword?: string) {
    const player = await this.playerModel
      .findOne({ email })
      .select('+verificationOtp');
    if (!player || !player.verificationOtp) {
      throw new BadRequestException('Invalid verification request');
    }
    if (player.isEmailVerified && !newPassword) {
      return { message: 'Email already verified' };
    }
    if (!player.otpExpiresAt || player.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired, please request a new one');
    }

    const isMatch = await bcrypt.compare(otp, player.verificationOtp);
    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    if (newPassword) {
      player.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    player.isEmailVerified = true;
    player.verificationOtp = undefined;
    player.otpExpiresAt = undefined;
    await player.save();

    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto): Promise<TokenPair & { player: { _id: Types.ObjectId; name: string; nickname: string; email: string; avatarUrl: string } }> {
    const player = await this.playerModel
      .findOne({ email: dto.email })
      .select('+passwordHash');
    if (!player) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, player.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!player.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const tokens = await this.issueTokens(player);
    await this.persistRefreshToken(player, tokens.refreshToken);
    const { _id, name, nickname, email, avatarUrl } = player;
    return { ...tokens, player: { _id, name, nickname, email, avatarUrl } };
  }

  async resendOtp(email: string) {
    const player = await this.playerModel.findOne({ email });
    if (!player) throw new BadRequestException('No account found for this email');

    const { otp, hashedOtp, expiresAt } = await this.generateOtp();
    player.verificationOtp = hashedOtp;
    player.otpExpiresAt = expiresAt;
    await player.save();

    try {
      await sendEmail({
        email: player.email,
        subject: 'Verify your email',
        message: `verification code: ${otp} (valid for 10 minutes)`,
      });

      return {
        message: 'Verification email sent. Please check your email.',
      };
    } catch (err: unknown) {
      player.verificationOtp = undefined;
      player.otpExpiresAt = undefined;
      await player.save();

      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }
  }

  async changePassword(playerId: string, newPassword: string, oldPassword: string) {
    const player = await this.playerModel.findById(playerId).select('passwordHash');
    if (!player) throw new NotFoundException('Player not found');

    const isMatch = await bcrypt.compare(oldPassword, player.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    player.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await player.save();

    return player;
  }

  async refresh(playerId: string, presentedRefreshToken: string): Promise<TokenPair> {
    const player = await this.playerModel
      .findById(playerId)
      .select('+hashedRefreshToken');
    if (!player || !player.hashedRefreshToken) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const isValid = await bcrypt.compare(presentedRefreshToken, player.hashedRefreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const tokens = await this.issueTokens(player);
    await this.persistRefreshToken(player, tokens.refreshToken);
    return tokens;
  }

  async logout(playerId: string): Promise<{ message: string }> {
    await this.playerModel.findByIdAndUpdate(playerId, {
      $unset: { hashedRefreshToken: 1 },
    });
    return { message: 'Logged out successfully' };
  }

  async resetPassword(playerEmail: string) {
    const player = await this.playerModel.findOne({ email: playerEmail });
    if (!player) throw new NotFoundException('Player not found');
    const defaultPassword = "12121212";
    player.passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    await player.save();
    return { message: 'Password reset successfully' };
  }

  async giveAdminRole(playerId: string) {
    const player = await this.playerModel.findById(playerId);
    if (!player) throw new NotFoundException('Player not found');

    player.role = PlayerRole.ADMIN;
    await player.save();
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async removeUnverifiedUsers() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const unverifiedPlayers = await this.playerModel.find({
      isEmailVerified: false,
      createdAt: { $lt: oneWeekAgo },
    }).select('_id').lean();

    if (unverifiedPlayers.length === 0) return;

    const playerIds = unverifiedPlayers.map((p: any) => p._id);

    await this.statsModel.deleteMany({ playerId: { $in: playerIds } });

    await this.playerModel.deleteMany({ _id: { $in: playerIds } });
  }

  private async generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
    const minutes = this.configService.get<number>('otp.expiresInMinutes') || 10;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    return { otp, hashedOtp, expiresAt };
  }

  private async issueTokens(player: PlayerDocument): Promise<TokenPair> {
    const payload = { sub: player._id.toString(), email: player.email, role: player.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
    });

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(player: PlayerDocument, refreshToken: string) {
    player.hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await player.save();
  }
}
