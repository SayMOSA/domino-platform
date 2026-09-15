import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
      }),
    }),
    CloudinaryModule,
    AuthModule,
    PlayersModule,
    MatchesModule,
  ],
})
export class AppModule {}
