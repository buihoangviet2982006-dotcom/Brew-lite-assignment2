import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  OrderJwtAuthGuard,
} from '../orders/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  SepayWebhookDto,
  SimulateSepayWebhookDto,
} from './dto/sepay-webhook.dto';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard';
import { PaymentsService } from './payments.service';

@Controller(['payments', 'api/v1/payments'])
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments
   * Khởi tạo thanh toán Ví/Thẻ (sinh mã VietQR động hoặc xử lý mô phỏng) kèm chống trùng Idempotency-Key
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OrderJwtAuthGuard)
  async createPayment(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.processPayment(
      req.user?.id,
      idempotencyKeyHeader,
      createPaymentDto,
    );
  }

  /**
   * GET /payments/order/:orderId/status
   * Cơ chế Polling trạng thái thanh toán của đơn hàng (kết hợp đối soát SePay Sandbox API v2 /v2/transactions)
   */
  @Get('order/:orderId/status')
  @UseGuards(OrderJwtAuthGuard)
  async getOrderPaymentStatus(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.pollPaymentStatusByOrder(
      orderId,
      req.user?.id,
    );
  }

  /**
   * POST /payments/sepay-webhook
   * Tiếp nhận Webhook biến động số dư từ SePay (xác thực qua Header Authorization: Apikey <SEPAY_WEBHOOK_SECRET>)
   */
  @Post('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SepayWebhookGuard)
  async handleSepayWebhook(@Body() payload: SepayWebhookDto) {
    return this.paymentsService.handleSepayWebhook(payload);
  }

  /**
   * POST /payments/sepay-webhook/simulate
   * Giả lập callback Webhook SePay trong môi trường Test Mode / Sandbox / CI E2E
   */
  @Post('sepay-webhook/simulate')
  @HttpCode(HttpStatus.OK)
  async simulateSepayWebhook(@Body() dto: SimulateSepayWebhookDto) {
    return this.paymentsService.simulateSepayWebhook(dto);
  }

  /**
   * GET /payments/sepay-sandbox/bank-accounts
   * Kiểm tra kết nối SePay Test mode API v2 (GET https://userapi-sandbox.sepay.vn/v2/bank-accounts)
   */
  @Get('sepay-sandbox/bank-accounts')
  async getSandboxBankAccounts() {
    return this.paymentsService.getSandboxBankAccounts();
  }
}

