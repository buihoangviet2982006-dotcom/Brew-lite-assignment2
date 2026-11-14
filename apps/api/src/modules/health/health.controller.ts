
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;

          return {
            database: {
              status: 'up',
            },
          };
        } catch {
          throw new HealthCheckError(
            'Database check failed',
            {
              database: {
                status: 'down',
              },
            },
          );
        }
      },

      () =>
        this.memory.checkHeap(
          'memory_heap',
          150 * 1024 * 1024,
        ),
    ]);
  }
}
