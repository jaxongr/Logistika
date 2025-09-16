import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Dashboard uchun authentication check
    if (req.path.startsWith('/dashboard')) {
      const session = (req as any).session;

      if (!session?.isAuthenticated) {
        return res.redirect('/auth/login');
      }
    }

    // API uchun authentication check
    if (req.path.startsWith('/api/dashboard')) {
      const session = (req as any).session;

      if (!session?.isAuthenticated) {
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