import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Player, PlayerSchema } from './schemas/player.schema';
import { Match, MatchSchema } from '../matches/schemas/match.schema';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PlayerSeasonStats , PlayerSeasonStatsSchema} from '../matches/schemas/stats.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Match.name, schema: MatchSchema },
      { name: PlayerSeasonStats.name, schema: PlayerSeasonStatsSchema },
    ]),
    MulterModule.register({ storage: memoryStorage() }),
    CloudinaryModule,
  ],
  providers: [PlayersService],
  controllers: [PlayersController],
  exports: [PlayersService, MongooseModule],
})
export class PlayersModule {}
