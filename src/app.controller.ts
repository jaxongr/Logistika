import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(@Res() res: Response) {
    const filePath = path.join(process.cwd(), 'public', 'index.html');
    console.log('Attempting to serve file from:', filePath);
    return res.sendFile(filePath);
  }

  @Get('webapp')
  webapp(@Res() res: Response) {
    try {
      return res.sendFile(path.join(process.cwd(), 'public', 'webapp.html'));
    } catch (error) {
      console.log('Webapp HTML file not found');
      return res.json({ 
        message: 'Mini-App endpoint',
        bot_token: '8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q',
        status: 'ready'
      });
    }
  }

  @Get('health')
  health() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }
}