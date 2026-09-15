import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PlayerRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export type PlayerDocument = Player & Document;

@Schema({ timestamps: true })
export class Player {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  nickname: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  // Hashed OTP so a leaked DB dump can't be used to verify arbitrary accounts.
  @Prop({ select: false })
  verificationOtp?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop()
  avatarUrl?: string;

  @Prop()
  avatarPublicId?: string;

  @Prop({ select: false })
  hashedRefreshToken?: string;

  @Prop({ type: String, enum: PlayerRole, default: PlayerRole.USER })
  role: PlayerRole;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

PlayerSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.hashedRefreshToken;
    delete ret.verificationOtp;
    return ret;
  },
});
