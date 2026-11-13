import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class SepayWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedSecret = (
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') ||
      'sepay_sandbox_secret_2026'
    ).trim();

    const authHeader = (request.headers.authorization || '').trim();
    const apiKeyHeader = String(request.headers['x-sepay-apikey'] || '').trim();

    let providedToken = '';

    if (authHeader.toLowerCase().startsWith('apikey ')) {
      providedToken = authHeader.slice(7).trim();
    } else if (authHeader.toLowerCase().startsWith('bearer ')) {
      providedToken = authHeader.slice(7).trim();
    } else if (apiKeyHeader) {
      providedToken = apiKeyHeader;
    }

    if (!providedToken || providedToken !== expectedSecret) {
      throw new UnauthorizedException(
        'Khóa xác thực SePay Webhook không hợp lệ hoặc bị thiếu',
      );
    }

    return true;
  }
}

