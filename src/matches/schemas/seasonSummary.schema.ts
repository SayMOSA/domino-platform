import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SeasonSummaryDocument = SeasonSummary & Document;

@Schema({ _id: false })
class TopPlayerDetail {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  playerId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  winRate: number;
}

const TopPlayerDetailSchema = SchemaFactory.createForClass(TopPlayerDetail);

@Schema({ timestamps: true })
export class SeasonSummary {
  @Prop({ required: true, unique: true, index: true })
  seasonId: string;

  @Prop({ type: [TopPlayerDetailSchema], required: true })
  highestWinRatePlayers: TopPlayerDetail[];

  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  mostWinsPlayer: Types.ObjectId;

  @Prop({ type: Number, required: true })
  mostWinsCount: number;

  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  mostMatchesPlayer: Types.ObjectId;

  @Prop({ type: Number, required: true })
  mostMatchesCount: number;

  @Prop({ type: Number, default: 0 })
  totalSeasonMatches: number;

  @Prop({ type: Number, default: 0 })
  totalActivePlayers: number;

  @Prop({ type: Number, default: 0 })
  averageMatchesPerPlayer: number;
}

export const SeasonSummarySchema = SchemaFactory.createForClass(SeasonSummary);