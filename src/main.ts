import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe, ExceptionFilter, Catch, ArgumentsHost, HttpException,
  HttpStatus, Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response, Express } from 'express';
import { AppModule } from './app.module';

let cachedApp: Express | null = null;

async function bootstrap(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { statusCode: 429, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', limiter);
  app.use(cookieParser());
  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');

  @Catch()
  class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
      response.status(status).json({ statusCode: status, message });
    }
  }

  @Injectable()
  class TransformInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler) {
      return next.handle();
    }
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Domino Tournament & Gaming Platform')
    .setDescription('REST + WebSocket API for rooms, matches, stats and chat')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  cachedApp = expressApp;
  return cachedApp;
}

// Vercel serverless entry point — Vercel calls this directly as (req, res)
export default async (req: Request, res: Response) => {
  const server = await bootstrap();
  server(req, res);
};
