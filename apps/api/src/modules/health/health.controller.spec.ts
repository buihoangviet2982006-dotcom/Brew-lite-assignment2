import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { HealthController } from './health.controller';

describe('HealthController (GET /health)', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        DatabaseHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    module.useLogger(false);
    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('1. Trả về HTTP 200 (status: ok) khi API và PostgreSQL hoạt động bình thường', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.details.api.status).toBe('up');
    expect(result.details.database.status).toBe('up');
  });

  it('2. Ném lỗi ServiceUnavailableException (HTTP 503) khi mất kết nối Database', async () => {
    mockPrismaService.$queryRaw.mockRejectedValueOnce(
      new Error('Connection refused'),
    );

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});