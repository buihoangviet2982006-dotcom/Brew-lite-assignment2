import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OrdersModule } from '../orders/orders.module';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SepaySandboxClient } from './sepay-sandbox.client';

@Module({
  imports: [
    OrdersModule,
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
  controllers: [PaymentsController],
  providers: [PaymentsService, SepaySandboxClient, SepayWebhookGuard],
  exports: [PaymentsService, SepaySandboxClient],
})
export class PaymentsModule {}

