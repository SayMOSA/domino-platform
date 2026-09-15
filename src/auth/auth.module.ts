import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Player, PlayerSchema } from '../players/schemas/player.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PlayerSeasonStats, PlayerSeasonStatsSchema } from 'src/matches/schemas/stats.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: PlayerSeasonStats.name, schema: PlayerSeasonStatsSchema }
    ]),
    PassportModule,
    JwtModule.register({}), // secrets/expiry are supplied per-call in AuthService (access vs refresh)
    MulterModule.register({ storage: memoryStorage() }),
    CloudinaryModule,
  ],
  providers: [AuthService, 
    JwtStrategy, 
    JwtAuthGuard, 
    JwtRefreshStrategy, 
    JwtRefreshAuthGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}