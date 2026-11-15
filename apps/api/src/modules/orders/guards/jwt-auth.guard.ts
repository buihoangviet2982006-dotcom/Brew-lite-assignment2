import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  userId: string;
  sub: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class OrderJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để thực hiện đặt đơn hàng',
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token xác thực không hợp lệ');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-in-production';

      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, { secret });

      const userId =
        (typeof payload.sub === 'string' && payload.sub) ||
        (typeof payload.userId === 'string' && payload.userId) ||
        (typeof payload.id === 'string' && payload.id);

      if (!userId) {
        throw new UnauthorizedException(
          'Token xác thực không chứa thông tin người dùng hợp lệ',
        );
      }

      request.user = {
        id: userId,
        userId,
        sub: userId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Phiên làm việc đã hết hạn hoặc JWT không hợp lệ',
      );
    }
  }
}