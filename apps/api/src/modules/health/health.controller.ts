import { Controller, Get, SetMetadata } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.indicator';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        Promise.resolve<HealthIndicatorResult>({
          api: {
            status: 'up',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
          },
        }),
      () => this.dbIndicator.isHealthy('database'),
    ]);
  }
}