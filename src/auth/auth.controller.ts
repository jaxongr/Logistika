import { Controller, Get, Post, Body, Req, Res, Session } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  // Super admin credentials
  private readonly SUPER_ADMIN = {
    username: 'jaxong1r',
    password: 'jaxadmin3699sa3'
  };

  @Get('login')
  showLoginPage(@Res() res: Response) {
    const filePath = path.join(process.cwd(), 'src', 'auth', 'login.html');
    return res.sendFile(filePath);
  }

  @Post('login')
  async login(
    @Body() loginDto: { username: string; password: string },
    @Session() session: any,
    @Res() res: Response
  ) {
    const { username, password } = loginDto;

    // Check super admin credentials
    if (username === this.SUPER_ADMIN.username && password === this.SUPER_ADMIN.password) {
      session.isAuthenticated = true;
      session.user = {
        username: username,
        role: 'super_admin'
      };

      return res.json({
        success: true,
        message: 'Muvaffaqiyatli kirdingiz',
        redirect: '/dashboard'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Login yoki parol xato!'
    });
  }

  @Post('logout')
  logout(@Session() session: any, @Res() res: Response) {
    session.destroy();
    return res.json({
      success: true,
      message: 'Muvaffaqiyatli chiqtingiz',
      redirect: '/auth/login'
    });
  }

  @Get('check')
  checkAuth(@Session() session: any) {
    return {
      isAuthenticated: !!session?.isAuthenticated,
      user: session?.user || null
    };
  }
}