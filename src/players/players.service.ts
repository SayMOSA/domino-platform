import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player, PlayerDocument } from './schemas/player.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PlayerSeasonStatsDocument } from 'src/matches/schemas/stats.schema';
import { PlayerSeasonStats } from 'src/matches/schemas/stats.schema';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(PlayerSeasonStats.name) private statsModel: Model<PlayerSeasonStatsDocument>,
    private cloudinaryService: CloudinaryService,
  ) { }

  async findById(playerId: string): Promise<PlayerDocument> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new NotFoundException('Player not found');
    }
    const player = await this.playerModel.findById(playerId).select('name nickname email avatarUrl');
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  async findByIdWithStats(playerId: string, seasonId: string): Promise<PlayerSeasonStatsDocument> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new NotFoundException('Player not found');
    }
    
    if (!seasonId) {
      seasonId = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    };

    const player = await this.playerModel.findById(playerId);
    if (!player) throw new NotFoundException('Player not found');
    const stats = await this.statsModel.findOne({ playerId: playerId, seasonId });
    return stats;
  }

  async updateAvatar(playerId: string, file: Express.Multer.File): Promise<PlayerDocument> {
    if (!file) throw new BadRequestException('Avatar image file is required');

    const player = await this.playerModel.findById(playerId);
    if (!player) throw new NotFoundException('Player not found');

    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const previousPublicId = player.avatarPublicId;

    player.avatarUrl = uploadResult.secure_url;
    player.avatarPublicId = uploadResult.public_id;
    await player.save();

    if (previousPublicId) {
      await this.cloudinaryService.deleteImage(previousPublicId).catch((): void => undefined);
    }

    return player;
  }

  async changeName(playerId: string, newName: string) {
    const player = await this.playerModel.findById(playerId);
    if (!player) throw new NotFoundException('Player not found');

    player.name = newName;
    await player.save();

    return player;
  }

  async changeNickname(playerId: string, newNickname: string) {
    const player = await this.playerModel.findById(playerId);
    if (!player) throw new NotFoundException('Player not found');

    const isValidNickname = await this.playerModel.exists({ nickname: newNickname, _id: { $ne: playerId } });
    if (isValidNickname) throw new BadRequestException('Nickname already in use');

    player.nickname = newNickname;
    await player.save();

    return player;
  }

  async getSeasonLeaderboard(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const seasonId = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const statsList = await this.statsModel
      .find({ seasonId })
      .sort({ winRate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('playerId', 'name nickname avatar')
      .lean();

    const total = await this.statsModel.countDocuments({ seasonId });

    return {
      data: statsList.map((stat) => ({
        player: stat.playerId,
        stats: {
          wins: stat.wins,
          losses: stat.losses,
          matchesPlayed: stat.matchesPlayed,
          score: stat.score,
          winRate: stat.winRate,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
