import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Dashboard uchun authentication check (enterprise namespace ishlatamiz)
    if (req.path.startsWith('/dashboard')) {
      const session = (req as any).session;

      // Enterprise auth session'ni tekshiramiz, balans tizimiga ta'sir qilmasligi uchun
      if (!session?.enterprise_auth?.isAuthenticated) {
        return res.redirect('/auth/login');
      }
    }

    // API uchun authentication check (enterprise namespace ishlatamiz)
    if (req.path.startsWith('/api/dashboard')) {
      const session = (req as any).session;

      // Enterprise auth session'ni tekshiramiz
      if (!session?.enterprise_auth?.isAuthenticated) {
        return res.status(401).json({
          success: false,
          message: 'Autentifikatsiya talab qilinadi',
          redirect: '/auth/login'
        });
      }
    }

    next();
  }
}