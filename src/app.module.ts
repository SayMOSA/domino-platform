import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('=> MongoDB connected successfully');
          });
          connection.on('error', (error: Error) => {
            console.error('=> MongoDB connection error: ', error);
          });
          return connection;
        },
      }),
    }),
    CloudinaryModule,
    AuthModule,
    PlayersModule,
    MatchesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}