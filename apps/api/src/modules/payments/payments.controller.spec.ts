import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrderJwtAuthGuard } from '../orders/guards/jwt-auth.guard';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    processPayment: jest.fn(),
    pollPaymentStatusByOrder: jest.fn(),
    handleSepayWebhook: jest.fn(),
    simulateSepayWebhook: jest.fn(),
    getSandboxBankAccounts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(OrderJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SepayWebhookGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('POST /payments chuyển tiếp userId, Idempotency-Key và body sang PaymentsService', async () => {
    const expected = {
      id: 'pending-1',
      orderId: 'order-1',
      idempotencyKey: 'key-123',
      amount: 49000,
      method: PaymentMethod.WALLET,
      status: 'PENDING',
      orderStatus: OrderStatus.PENDING,
      paymentRef: 'BREWORDER1',
      qrCodeUrl: 'https://img.vietqr.io/image/MB-0123456789-compact2.png',
    };
    mockPaymentsService.processPayment.mockResolvedValue(expected);

    const req = { user: { id: 'user-1', userId: 'user-1', sub: 'user-1' } };
    const res = await controller.createPayment(req as never, 'key-123', {
      orderId: 'order-1',
      method: PaymentMethod.WALLET,
    });

    expect(mockPaymentsService.processPayment).toHaveBeenCalledWith(
      'user-1',
      'key-123',
      { orderId: 'order-1', method: PaymentMethod.WALLET },
    );
    expect(res).toEqual(expected);
  });

  it('GET /payments/order/:orderId/status gọi pollPaymentStatusByOrder', async () => {
    mockPaymentsService.pollPaymentStatusByOrder.mockResolvedValue({
      orderId: 'order-1',
      status: PaymentStatus.SUCCEEDED,
      orderStatus: OrderStatus.PAID,
    });

    const req = { user: { id: 'user-1', userId: 'user-1', sub: 'user-1' } };
    const res = await controller.getOrderPaymentStatus(req as never, 'order-1');

    expect(mockPaymentsService.pollPaymentStatusByOrder).toHaveBeenCalledWith(
      'order-1',
      'user-1',
    );
    expect(res.orderStatus).toBe(OrderStatus.PAID);
  });

  it('POST /payments/sepay-webhook gọi handleSepayWebhook', async () => {
    mockPaymentsService.handleSepayWebhook.mockResolvedValue({
      success: true,
      idempotentReplayed: false,
    });

    const res = await controller.handleSepayWebhook({
      id: 1001,
      content: 'BREWORDER1',
      transferType: 'in',
      transferAmount: 49000,
    });

    expect(res.success).toBe(true);
  });
});

