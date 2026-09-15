import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/is-admin.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchQueryDto } from './dto/match-query.dto';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Record a new domino match (Admins only)' })
  recordMatch(
    @CurrentUser('sub') recordedBy: string,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matchesService.createMatch(recordedBy, dto);
  }

  @Get('season-summary/:seasonId')
  @ApiOperation({ summary: 'Get season summary' })
  getSeasonSummary(@Param('seasonId') seasonId: string) {
    return this.matchesService.getSeasonSummary(seasonId);
  }

  @Get()
  @ApiOperation({ summary: 'Get match history for a specific season' })
  getSeasonMatches(@Query() query: MatchQueryDto) {
    return this.matchesService.getMatches(query);
  }

}
