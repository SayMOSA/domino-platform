import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { PlayerSeasonStats, PlayerSeasonStatsSchema } from './schemas/stats.schema';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { AdminGuard } from '../common/guards/is-admin.guards';
import { Player , PlayerSchema } from 'src/players/schemas/player.schema';
import { SeasonSummary, SeasonSummarySchema } from './schemas/seasonSummary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: PlayerSeasonStats.name, schema: PlayerSeasonStatsSchema },
      { name: Player.name, schema: PlayerSchema },
      { name: SeasonSummary.name, schema: SeasonSummarySchema },
    ]),
  ],
  providers: [MatchesService, AdminGuard],
  controllers: [MatchesController],
  exports: [MatchesService, MongooseModule],
})
export class MatchesModule {}
