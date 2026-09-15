import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match, MatchDocument, MatchType } from './schemas/match.schema';
import { PlayerRelationDetail, PlayerSeasonStats, PlayerSeasonStatsDocument } from './schemas/stats.schema';
import { MatchQueryDto } from './dto/match-query.dto';
import { Player, PlayerDocument } from 'src/players/schemas/player.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeasonSummary, SeasonSummaryDocument } from './schemas/seasonSummary.schema';

const matchTypeRules: { type: MatchType; winnerPlayers: number; loserPlayers: number }[] = [
  { type: MatchType.DOMINO_INDIVIDUAL, winnerPlayers: 1, loserPlayers: 1 },
  { type: MatchType.DOMINO_PARTNERSHIP, winnerPlayers: 2, loserPlayers: 2 },
  { type: MatchType.DOMINO_TRIO, winnerPlayers: 1, loserPlayers: 2 },
  { type: MatchType.DOMINO_FOUR, winnerPlayers: 1, loserPlayers: 3 },
];

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(PlayerSeasonStats.name) private statsModel: Model<PlayerSeasonStatsDocument>,
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(SeasonSummary.name) private summaryModel: Model<SeasonSummaryDocument>,
  ) { }

  async createMatch(
    recordedBy: string,
    dto: {
      winningTeam: string[],
      losingTeam: string[],
      winningPoints: number,
      losingPoints: number,
      matchType: MatchType
    }) {
    const { winningTeam, losingTeam, winningPoints, losingPoints, matchType } = dto;

    const rule = matchTypeRules.find((r) => r.type === matchType);
    if (!rule || winningTeam.length !== rule.winnerPlayers || losingTeam.length !== rule.loserPlayers) {
      throw new BadRequestException('Invalid team sizes for the specified match type');
    }

    if (winningPoints < 0 || losingPoints < 0) {
      throw new BadRequestException('Match scores cannot be negative');
    }

    const hasIntersection = winningTeam.some((id) => losingTeam.includes(id));
    if (hasIntersection) {
      throw new BadRequestException('A player cannot be both winner and loser in the same match');
    }

    for (const id of winningTeam) {
      const playerExists = await this.playerModel.exists({ _id: id });
      if (!playerExists) {
        throw new BadRequestException(`Player with ID ${id} does not exist`);
      }
    }
    for (const id of losingTeam) {
      const playerExists = await this.playerModel.exists({ _id: id });
      if (!playerExists) {
        throw new BadRequestException(`Player with ID ${id} does not exist`);
      }
    }
    const now = new Date();
    const seasonId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const winningObjectIds = winningTeam.map((id) => new Types.ObjectId(id));
    const losingObjectIds = losingTeam.map((id) => new Types.ObjectId(id));

    const match = await this.matchModel.create({
      winningTeam: winningObjectIds,
      losingTeam: losingObjectIds,
      winningPoints,
      losingPoints,
      matchType,
      recordedBy: new Types.ObjectId(recordedBy),
      seasonId,
    });

    const winnerUpdates = winningObjectIds.map(async (winnerId) => {
      const player = await this.statsModel.findOne({ playerId: winnerId, seasonId });

      player.matchesPlayed += 1;
      player.wins += 1;
      player.score += winningPoints;
      player.winRate = (player.wins / player.matchesPlayed) * 100;
      player.biggestWinPoints = Math.max(player.biggestWinPoints, winningPoints);
      player.currentStreak = (!player.lastMatchResult) ? 1 : player.currentStreak + 1;
      player.bestWinStreak = Math.max(player.bestWinStreak, player.currentStreak);
      player.lastMatchResult = true;
      for (const partnerId of winningTeam) {
        if (partnerId === String(winnerId)) continue;
        if (!player.partnerStats.has(partnerId)) {
          player.partnerStats.set(partnerId, new PlayerRelationDetail());
        }
        player.partnerStats.get(partnerId).partnerWins += 1;
        player.partnerStats.get(partnerId).totalMatchesAsPartner += 1;
      }
      for (const loserId of losingTeam) {
        if (!player.partnerStats.has(loserId)) {
          player.partnerStats.set(loserId, new PlayerRelationDetail());
        }
        player.partnerStats.get(loserId).winAgainst += 1;
      }

      return player.save();
    }
    );

    const loserUpdates = losingObjectIds.map(async (loserId) => {
      const player = await this.statsModel.findOne({ playerId: loserId, seasonId });
      player.matchesPlayed += 1;
      player.losses += 1;
      player.score += losingPoints;
      player.winRate = (player.wins / player.matchesPlayed) * 100;
      player.currentStreak = (player.lastMatchResult) ? 1 : player.currentStreak + 1;
      player.worstLossStreak = Math.max(player.worstLossStreak, player.currentStreak);
      player.lastMatchResult = false;
      player.onWhite += (losingPoints === 0) ? 1 : 0;
      for (const partnerId of losingTeam) {
        if (partnerId === String(loserId)) continue;
        if (!player.partnerStats.has(partnerId)) {
          player.partnerStats.set(partnerId, new PlayerRelationDetail());
        }
        player.partnerStats.get(partnerId).partnerLosses += 1;
        player.partnerStats.get(partnerId).totalMatchesAsPartner += 1;
      }
      for (const winnerId of winningTeam) {
        if (!player.partnerStats.has(winnerId)) {
          player.partnerStats.set(winnerId, new PlayerRelationDetail());
        }
        player.partnerStats.get(winnerId).lossesAgainst += 1;
      }

      return player.save();
    }
    );

    try {
      await Promise.all([...winnerUpdates, ...loserUpdates]);
    } catch (e) {
      console.log(e);
    }

    return {
      message: 'Match recorded and stats updated successfully',
      matchId: match._id,
    };
  }

  async getMatches(query: MatchQueryDto) {
    const { page, limit, playerId, playerStatus } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (playerId) {
      const playerObjectId = new Types.ObjectId(playerId);

      if (playerStatus === 'winner') {
        filter.winningTeam = playerObjectId;
      } else if (playerStatus === 'loser') {
        filter.losingTeam = playerObjectId;
      } else {
        filter.$or = [
          { winningTeam: playerObjectId },
          { losingTeam: playerObjectId },
        ];
      }
    }

    const [data, total] = await Promise.all([
      this.matchModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate('winningTeam losingTeam recordedBy', 'name nickname'),
      this.matchModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSeasonSummary(seasonId: string) {
    const summary = await this.summaryModel
      .findOne({ seasonId })
      .populate([
        { path: 'highestWinRatePlayers.playerId', select: 'name nickname avatar' },
        { path: 'mostWinsPlayer', select: 'name nickname avatar' },
        { path: 'mostMatchesPlayer', select: 'name nickname avatarUrl' },
      ]);

    if (!summary) {
      throw new NotFoundException('Season summary not found');
    }

    return summary;
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlySeasonSummary() {

    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const seasonId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalActivePlayers = await this.statsModel.countDocuments({ seasonId });

    const totalSeasonMatches = await this.matchModel.countDocuments();

    if (totalActivePlayers === 0 || totalSeasonMatches === 0) {
      return;
    }

    const averageMatchesPerPlayer = Math.round(totalSeasonMatches / totalActivePlayers);

    const topWins = await this.statsModel
      .findOne({ seasonId })
      .sort({ wins: -1 })
      .lean();

    const topMatches = await this.statsModel
      .findOne({ seasonId })
      .sort({ matchesPlayed: -1 })
      .lean();

    const topWinRate = await this.statsModel
      .find({ seasonId, matchesPlayed: { $gte: 10 } })
      .sort({ winRate: -1 })
      .limit(3)
      .lean();

    if (!topWins || !topMatches || topWinRate.length === 0) {
      return;
    }


    const formattedTopWinRates = topWinRate.map((player:any) => ({
      playerId: player.playerId,
      winRate: player.winRate,
    }));
    await this.summaryModel.create({
      seasonId,
      highestWinRatePlayers: formattedTopWinRates,
      mostWinsPlayer: topWins.playerId,
      mostWinsCount: topWins.wins,
      mostMatchesPlayer: topMatches.playerId,
      mostMatchesCount: topMatches.matchesPlayed,
      totalSeasonMatches,
      totalActivePlayers,
      averageMatchesPerPlayer,
    });
    await this.matchModel.deleteMany({ seasonId });
    return;
  }

}