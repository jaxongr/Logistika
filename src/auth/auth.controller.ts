import { Controller, Get, Post, Body, Req, Res, Session } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  // Korxona kredensiyallari - Balans tizimi bilan ajratilgan
  private readonly ENTERPRISE_CREDENTIALS = [
    { username: 'admin', password: 'LogiMaster2024!', role: 'Tizim Administratori' },
    { username: 'menejer', password: 'Menejer@2024', role: 'Operatsiya Menejeri' },
    { username: 'nazorchi', password: 'Nazorchi123', role: 'Ombor Nazorchisi' },
    { username: 'tahlilchi', password: 'Tahlil@Pro', role: 'Biznes Tahlilchi' },
    { username: 'direktor@logimaster.uz', password: 'Direktor2024!', role: 'Operatsiya Direktori' },
    { username: 'admin@logimaster.uz', password: 'Admin@Korxona', role: 'Tizim Administratori' },
    { username: 'boshqaruvchi', password: 'Boshqaruvchi@2024', role: 'Bosh Boshqaruvchi' },
    { username: 'operator', password: 'Operator123!', role: 'Tizim Operatori' },
    // Super admin (mavjud tizim bilan moslik uchun)
    { username: 'jaxong1r', password: 'jaxadmin3699sa3', role: 'Super Admin' }
  ];

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

    // Enterprise credentials tekshiruvi
    const user = this.ENTERPRISE_CREDENTIALS.find(cred =>
      cred.username.toLowerCase() === username.toLowerCase() &&
      cred.password === password
    );

    if (user) {
      // Session ma'lumotlarini saqlash (balans tizimi bilan ajratilgan namespace)
      session.enterprise_auth = {
        isAuthenticated: true,
        user: {
          username: user.username,
          role: user.role,
          loginTime: new Date().toISOString(),
          sessionType: 'enterprise_dashboard'
        }
      };

      return res.json({
        success: true,
        message: 'Autentifikatsiya muvaffaqiyatli!',
        redirect: '/dashboard',
        user: {
          username: user.username,
          role: user.role
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Noto\'g\'ri kredensiyallar. Iltimos, foydalanuvchi nomi va parolingizni tekshiring.'
    });
  }

  @Post('logout')
  logout(@Session() session: any, @Res() res: Response) {
    // Faqat enterprise auth session'ni tozalash, balans tizimiga ta'sir qilmaslik uchun
    if (session.enterprise_auth) {
      delete session.enterprise_auth;
    }

    return res.json({
      success: true,
      message: 'Muvaffaqiyatli chiqtingiz',
      redirect: '/auth/login'
    });
  }

  @Get('check')
  checkAuth(@Session() session: any) {
    return {
      isAuthenticated: !!session?.enterprise_auth?.isAuthenticated,
      user: session?.enterprise_auth?.user || null,
      sessionType: session?.enterprise_auth?.user?.sessionType || null
    };
  }
}