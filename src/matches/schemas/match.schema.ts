import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MatchType {
  DOMINO_INDIVIDUAL = 'DOMINO_INDIVIDUAL', // 1v1
  DOMINO_PARTNERSHIP = 'DOMINO_PARTNERSHIP', // 2v2
  DOMINO_TRIO = 'DOMINO_TRIO', // 1v1v1
  DOMINO_FOUR = 'DOMINO_FOUR', // 1v1v1v1
}

export type MatchDocument = Match & Document;

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: String, enum: MatchType, required: true })
  matchType: MatchType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Player' }], required: true })
  winningTeam: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Player' }], required: true })
  losingTeam: Types.ObjectId[];

  @Prop({ required: true, min: 0 })
  winningPoints: number;

  @Prop({ required: true, min: 0 })
  losingPoints: number;

  @Prop({ default: Date.now })
  playedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  recordedBy: Types.ObjectId;

  @Prop({ required: true, index: true })
  seasonId: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
