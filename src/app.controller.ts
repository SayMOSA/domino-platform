import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello(): string {
    return 'Balata API is running successfully! 🚀';
  }

  @Get('health')
  checkHealth() {
    return {
      status: 'ok',
      message: 'Server is up and running!',
      timestamp: new Date().toISOString(),
    };
  }
}