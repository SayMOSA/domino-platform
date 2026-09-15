import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerSeasonStatsDocument = PlayerSeasonStats & Document;

@Schema( )
export class PlayerRelationDetail {
  @Prop({ type: Number, default: 0 })
  partnerWins: number;

  @Prop({ type: Number, default: 0 })
  partnerLosses: number;

  @Prop({ type: Number, default: 0 })
  winAgainst: number;

  @Prop({ type: Number, default: 0 })
  lossesAgainst: number;

  @Prop({ type: Number, default: 0 })
  totalMatchesAsPartner: number;
}
export const PlayerRelationDetailSchema = SchemaFactory.createForClass(PlayerRelationDetail);

@Schema({ timestamps: true })
export class PlayerSeasonStats {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, index: true })
  playerId: Types.ObjectId;

  @Prop({ required: true, index: true })
  seasonId: string;

  @Prop({ default: 0 })
  matchesPlayed: number;

  @Prop({ default: 0 })
  wins: number;

  @Prop({ default: 0 })
  losses: number;

  @Prop({ default: 0 })
  score: number; 

  @Prop({ default: 0 })
  winRate: number;

  @Prop({ default: 0 })
  onWhite: number;

  @Prop({ default: 0 })
  biggestWinPoints: number;

  @Prop({ default: 0 })
  bestWinStreak: number;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: false })
  lastMatchResult: boolean; // 1 for win, 0 for loss
  
  @Prop({ default: 0 })
  worstLossStreak: number;

  @Prop({
    type: Map,
    of: PlayerRelationDetailSchema,
    default: new Map<string, PlayerRelationDetail>(),
  })
  partnerStats: Map<string, PlayerRelationDetail>;
}

export const PlayerSeasonStatsSchema = SchemaFactory.createForClass(PlayerSeasonStats);

PlayerSeasonStatsSchema.index({ seasonId: 1, score: -1 });
PlayerSeasonStatsSchema.index({ playerId: 1, seasonId: 1 }, { unique: true });