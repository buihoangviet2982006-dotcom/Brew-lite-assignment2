import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token xác thực không hợp lệ');
      }
      throw err || new UnauthorizedException('Vui lòng đăng nhập để thực hiện thao tác này');
    }
    return user;
  }
}
