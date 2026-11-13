import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OrderJwtAuthGuard } from './guards/jwt-auth.guard';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-super-secret-jwt-key-change-in-production',
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderJwtAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule {}