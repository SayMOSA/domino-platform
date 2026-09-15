import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) { }
  
  @Get('profile')
  @ApiOperation({ summary: "Fetch the current authenticated player's profile" })
  getProfile(@CurrentUser('sub') playerId: string) {
    return this.playersService.findById(playerId);
  }

  @Get()
  async getLeaderboard(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.playersService.getSeasonLeaderboard(page, limit);
  }

  @Patch('update-avatar')
  @ApiOperation({ summary: 'Update profile picture (replaces the Cloudinary asset)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @CurrentUser('sub') playerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.playersService.updateAvatar(playerId, file);
  }

  @Patch('change-name')
  @ApiOperation({ summary: 'Change player name' })
  changeName(@CurrentUser('sub') playerId: string, @Body('newName') newName: string) {
    return this.playersService.changeName(playerId, newName);
  }

  @Patch('change-nickname')
  @ApiOperation({ summary: 'Change player nickname' })
  changeNickname(@CurrentUser('sub') playerId: string, @Body('newNickname') newNickname: string) {
    return this.playersService.changeNickname(playerId, newNickname);
  }

  @Get(':playerId')
  @ApiOperation({ summary: 'Fetch a player by ID' })
  getPlayer(@Param('playerId') playerId: string) {
    return this.playersService.findById(playerId);
  }

  @Get(':playerId/stats')
  @ApiOperation({ summary: 'Fetch a player\'s stats by ID' })
  getPlayerStats(@Param('playerId') playerId: string, @Query('seasonId') seasonId: string) {
    return this.playersService.findByIdWithStats(playerId, seasonId);
  }
}
