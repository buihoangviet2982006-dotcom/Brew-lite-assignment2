import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub?: string;
  userId?: string;
  id?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  userId: string;
  sub: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const userId = payload.sub || payload.userId || payload.id;
    if (!userId) {
      throw new UnauthorizedException(
        'Token xác thực không chứa thông tin người dùng hợp lệ',
      );
    }

    if (this.prisma?.user?.findUnique) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new UnauthorizedException(
          'Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa',
        );
      }
      return {
        id: user.id,
        userId: user.id,
        sub: user.id,
        email: user.email,
      };
    }

    return {
      id: userId,
      userId,
      sub: userId,
      email: payload.email,
    };
  }
}
