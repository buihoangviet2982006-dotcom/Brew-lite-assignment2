import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  GatewayTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { SepaySandboxClient } from './sepay-sandbox.client';
import { SepayWebhookGuard } from './guards/sepay-webhook.guard';
import { generatePaymentRef } from './utils/vietqr.util';

describe('PaymentsService & SePay Sandbox Integration (FR-06 / ADR-004)', () => {
  let service: PaymentsService;
  let sepayClient: SepaySandboxClient;

  const mockTx = {
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    ingredient: {
      updateMany: jest.fn(),
    },
    promotion: {
      updateMany: jest.fn(),
    },
    loyaltyTransaction: {
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
    ),
  };

  const mockConfigValues: Record<string, string> = {
    SEPAY_API_BASE_URL: 'https://userapi-sandbox.sepay.vn/v2',
    SEPAY_API_TOKEN: '',
    SEPAY_WEBHOOK_SECRET: 'sepay_sandbox_secret_2026',
    VIETQR_BANK_ID: 'MB',
    VIETQR_ACCOUNT_NO: '0123456789',
    VIETQR_ACCOUNT_NAME: 'BREWLITE COFFEE',
    VIETQR_TEMPLATE: 'compact2',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => mockConfigValues[key]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        SepaySandboxClient,
        SepayWebhookGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    sepayClient = module.get<SepaySandboxClient>(SepaySandboxClient);
    jest.clearAllMocks();
  });

  const samplePendingOrder = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    subtotal: 98000,
    discountAmount: 10000,
    total: 88000,
    promotionId: 'promo-1',
    payment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [
      {
        id: 'oi-1',
        quantity: 2,
        product: {
          id: 'prod-1',
          recipeItems: [
            {
              ingredientId: 'ing-1',
              quantityRequired: 20,
            },
          ],
        },
      },
    ],
  };

  it('1. Khởi tạo thanh toán với WALLET hoặc CARD sinh đúng mã VietQR động và giữ Order ở PENDING', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValue(null);
    mockPrismaService.order.findUnique.mockResolvedValue(samplePendingOrder);

    const result = await service.processPayment('user-1', 'idem-key-qr-001', {
      orderId: samplePendingOrder.id,
      method: PaymentMethod.WALLET,
    });

    const expectedRef = generatePaymentRef(samplePendingOrder.id);
    expect(result.status).toBe('PENDING');
    expect(result.orderStatus).toBe(OrderStatus.PENDING);
    expect(result.method).toBe(PaymentMethod.WALLET);
    expect(result.paymentRef).toBe(expectedRef);
    expect(result.qrCodeUrl).toContain(
      `https://img.vietqr.io/image/MB-0123456789-compact2.png`,
    );
    expect(result.qrCodeUrl).toContain(`amount=88000`);
    expect(result.qrCodeUrl).toContain(`addInfo=${expectedRef}`);
    expect(result.idempotentReplayed).toBe(false);
  });

  it('2. Idempotency chiều Client: Gửi lặp 2 request cùng Idempotency-Key không tạo giao dịch mới', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValueOnce({
      id: 'pay-existing-1',
      orderId: samplePendingOrder.id,
      idempotencyKey: 'idem-duplicate-key',
      amount: 88000,
      method: PaymentMethod.CARD,
      status: PaymentStatus.SUCCEEDED,
      createdAt: new Date(),
      order: {
        ...samplePendingOrder,
        status: OrderStatus.PAID,
      },
    });

    const secondCall = await service.processPayment(
      'user-1',
      'idem-duplicate-key',
      {
        orderId: samplePendingOrder.id,
        method: PaymentMethod.CARD,
      },
    );

    expect(secondCall.id).toBe('pay-existing-1');
    expect(secondCall.status).toBe(PaymentStatus.SUCCEEDED);
    expect(secondCall.orderStatus).toBe(OrderStatus.PAID);
    expect(secondCall.idempotentReplayed).toBe(true);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('3. Thanh toán mô phỏng Ví/Thẻ thành công (simulateScenario: SUCCESS) cập nhật Payment SUCCEEDED, Order PAID và cộng điểm Loyalty', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValue(null);
    mockPrismaService.order.findUnique.mockResolvedValue(samplePendingOrder);
    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.payment.create.mockResolvedValue({
      id: 'pay-success-1',
      orderId: samplePendingOrder.id,
      idempotencyKey: 'idem-sim-success',
      amount: 88000,
      method: PaymentMethod.CARD,
      status: PaymentStatus.SUCCEEDED,
      createdAt: new Date(),
    });

    const result = await service.processPayment('user-1', 'idem-sim-success', {
      orderId: samplePendingOrder.id,
      method: PaymentMethod.CARD,
      simulateScenario: 'SUCCESS',
    });

    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    expect(result.orderStatus).toBe(OrderStatus.PAID);
    expect(result.loyaltyPointsEarned).toBe(8);
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: samplePendingOrder.id },
      data: { status: OrderStatus.PAID },
    });
    expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          orderId: samplePendingOrder.id,
          points: 8,
        }),
      }),
    );
  });

  it('4. Nhận SePay Sandbox Webhook hợp lệ -> chốt Payment SUCCEEDED, Order PAID và chống trùng lặp khi SePay retry Webhook', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValue(null);
    mockPrismaService.order.findUnique.mockResolvedValue(samplePendingOrder);

    // Khởi tạo phiên QR trước với phương thức CARD và Idempotency-Key của Client
    const qrInit = await service.processPayment('user-1', 'idem-client-card', {
      orderId: samplePendingOrder.id,
      method: PaymentMethod.CARD,
    });

    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.payment.create.mockResolvedValue({
      id: 'pay-webhook-1',
      orderId: samplePendingOrder.id,
      idempotencyKey: 'idem-client-card',
      amount: 88000,
      method: PaymentMethod.CARD,
      status: PaymentStatus.SUCCEEDED,
      createdAt: new Date(),
    });

    const webhookPayload = {
      id: 92704,
      gateway: 'MBBank',
      transferType: 'in',
      transferAmount: 88000,
      code: qrInit.paymentRef,
      content: `${qrInit.paymentRef} chuyen tien mua ca phe`,
      referenceCode: 'FT260001',
    };

    const firstWebhook = await service.handleSepayWebhook(webhookPayload);
    expect(firstWebhook.success).toBe(true);
    expect(firstWebhook.idempotentReplayed).toBe(false);
    expect(firstWebhook.orderStatus).toBe(OrderStatus.PAID);
    expect(mockTx.payment.create).toHaveBeenCalledTimes(1);

    // SePay gửi lặp lại cùng một Webhook (id: 92704) -> không gọi lại DB Transaction
    const duplicateWebhook = await service.handleSepayWebhook(webhookPayload);
    expect(duplicateWebhook.success).toBe(true);
    expect(duplicateWebhook.idempotentReplayed).toBe(true);
    expect(mockTx.payment.create).toHaveBeenCalledTimes(1);
  });

  it('5. Cơ chế Polling chủ động đối soát SePay Sandbox API v2 (/v2/transactions) và tự động chốt đơn PAID', async () => {
    mockPrismaService.order.findUnique.mockResolvedValue(samplePendingOrder);
    const paymentRef = generatePaymentRef(samplePendingOrder.id);

    jest
      .spyOn(sepayClient, 'findMatchingIncomingTransaction')
      .mockResolvedValueOnce({
        id: 'sepay-v2-uuid-999',
        amountIn: 88000,
        content: `Thanh toan ${paymentRef}`,
        referenceNumber: 'FT999',
        bankBrandName: 'MB',
        transactionDate: '2026-11-13 20:00:00',
      });

    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.payment.create.mockResolvedValue({
      id: 'pay-polled-1',
      orderId: samplePendingOrder.id,
      idempotencyKey: 'sepay-poll-sepay-v2-uuid-999',
      amount: 88000,
      method: PaymentMethod.WALLET,
      status: PaymentStatus.SUCCEEDED,
      createdAt: new Date(),
    });

    const polled = await service.pollPaymentStatusByOrder(
      samplePendingOrder.id,
      'user-1',
    );

    expect(polled.status).toBe(PaymentStatus.SUCCEEDED);
    expect(polled.orderStatus).toBe(OrderStatus.PAID);
    expect(polled.loyaltyPointsEarned).toBe(8);
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: samplePendingOrder.id },
      data: { status: OrderStatus.PAID },
    });
  });

  it('6. Kịch bản MOCK_FAIL trả về 400 Bad Request, chuyển Order sang PAYMENT_FAILED và hoàn trả tồn kho nguyên liệu + Promotion', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValue(null);
    mockPrismaService.order.findUnique.mockResolvedValue(samplePendingOrder);

    await expect(
      service.processPayment('user-1', 'idem-fail-001', {
        orderId: samplePendingOrder.id,
        method: PaymentMethod.WALLET,
        simulateScenario: 'MOCK_FAIL',
      }),
    ).rejects.toThrow(BadRequestException);

    // Kiểm tra hoàn trả 40g nguyên liệu (2 ly * 20g) và giảm usedCount của Promotion
    expect(mockTx.ingredient.updateMany).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      data: {
        stockQuantity: { increment: 40 },
        version: { increment: 1 },
      },
    });
    expect(mockTx.promotion.updateMany).toHaveBeenCalledWith({
      where: { id: 'promo-1', usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: samplePendingOrder.id },
      data: { status: OrderStatus.PAYMENT_FAILED },
    });
  });

  it('7. Đơn hàng có tổng tiền kết thúc bằng đuôi 99 kích hoạt 504 Gateway Timeout và Rollback tồn kho', async () => {
    mockPrismaService.payment.findUnique.mockResolvedValue(null);
    mockPrismaService.order.findUnique.mockResolvedValue({
      ...samplePendingOrder,
      total: 59099,
    });

    await expect(
      service.processPayment('user-1', 'idem-timeout-99', {
        orderId: samplePendingOrder.id,
        method: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(GatewayTimeoutException);

    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: samplePendingOrder.id },
      data: { status: OrderStatus.PAYMENT_FAILED },
    });
  });

  it('8. SepayWebhookGuard chặn request không có Apikey hợp lệ (401 Unauthorized)', () => {
    const guard = new SepayWebhookGuard(
      mockConfigService as unknown as ConfigService,
    );

    const validContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Apikey sepay_sandbox_secret_2026',
          },
        }),
      }),
    } as never;

    expect(guard.canActivate(validContext)).toBe(true);

    const invalidContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Apikey wrong_secret',
          },
        }),
      }),
    } as never;

    expect(() => guard.canActivate(invalidContext)).toThrow(
      UnauthorizedException,
    );
  });
});

