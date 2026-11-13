import {
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  SepayWebhookDto,
  SimulateSepayWebhookDto,
} from './dto/sepay-webhook.dto';
import { SepaySandboxClient } from './sepay-sandbox.client';
import {
  buildVietQrUrl,
  extractPaymentRef,
  generatePaymentRef,
  matchesPaymentRef,
  VietQrBankInfo,
} from './utils/vietqr.util';

export interface PendingPaymentSession {
  sessionId: string;
  orderId: string;
  userId: string;
  idempotencyKey: string;
  method: PaymentMethod;
  amount: number;
  paymentRef: string;
  qrCodeUrl: string;
  bankInfo: VietQrBankInfo;
  createdAt: Date;
}

export interface PaymentResultResponse {
  id: string;
  orderId: string;
  idempotencyKey: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus | 'PENDING';
  orderStatus: OrderStatus;
  paymentRef: string;
  qrCodeUrl: string;
  bankInfo: VietQrBankInfo;
  loyaltyPointsEarned: number;
  idempotentReplayed: boolean;
  transactionRef?: string;
  createdAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Lưu tạm phiên chờ quét mã QR VietQR (giữ nguyên schema.prisma không thêm cột phụ)
  private readonly pendingSessionsByOrder = new Map<
    string,
    PendingPaymentSession
  >();
  private readonly idempotencyKeyToOrder = new Map<string, string>();
  private readonly processedWebhookTxIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sepaySandboxClient: SepaySandboxClient,
  ) {}

  /**
   * Chuẩn hóa phương thức thanh toán về đúng enum PaymentMethod (WALLET | CARD) trong schema.prisma
   */
  private normalizePaymentMethod(rawMethod: string): PaymentMethod {
    const upper = (rawMethod || '').trim().toUpperCase();
    if (upper === 'CARD' || upper === 'CARD_MOCK') {
      return PaymentMethod.CARD;
    }
    if (
      upper === 'WALLET' ||
      upper === 'EWALLET_MOCK' ||
      upper === 'VIETQR' ||
      upper === 'VIETQR_SEPAY'
    ) {
      return PaymentMethod.WALLET;
    }
    throw new BadRequestException(
      'Phương thức thanh toán không hợp lệ (chỉ chấp nhận WALLET hoặc CARD)',
    );
  }

  /**
   * Khởi tạo thanh toán (POST /payments)
   * - Khi chọn WALLET hoặc CARD ở chế độ mặc định / QR: trả về mã QR VietQR động & lưu phiên chờ để Polling / nhận SePay Webhook
   * - Hỗ trợ kịch bản mô phỏng xác định (SUCCESS, MOCK_FAIL, TIMEOUT / tổng tiền đuôi 99)
   * - Đảm bảo Idempotency tuyệt đối theo Idempotency-Key
   */
  async processPayment(
    userId: string | undefined,
    headerIdempotencyKey: string | undefined,
    dto: CreatePaymentDto,
  ): Promise<PaymentResultResponse> {
    const idempotencyKey = (
      headerIdempotencyKey ||
      dto.idempotencyKey ||
      ''
    ).trim();

    if (!idempotencyKey) {
      throw new BadRequestException(
        'Header Idempotency-Key là bắt buộc để chống thanh toán trùng lặp',
      );
    }

    const bankInfo = await this.sepaySandboxClient.resolveVietQrBankConfig();

    // 1. Kiểm tra Idempotency chiều Client trong bảng Payment (PostgreSQL)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      const paymentRef = generatePaymentRef(existingPayment.orderId);
      const qrCodeUrl = buildVietQrUrl({
        bankId: bankInfo.bankId,
        accountNo: bankInfo.accountNo,
        accountName: bankInfo.accountName,
        template: bankInfo.template,
        amount: Number(existingPayment.amount),
        paymentRef,
      });

      return {
        id: existingPayment.id,
        orderId: existingPayment.orderId,
        idempotencyKey: existingPayment.idempotencyKey,
        amount: Number(existingPayment.amount),
        method: existingPayment.method,
        status: existingPayment.status,
        orderStatus:
          existingPayment.order?.status ??
          (existingPayment.status === PaymentStatus.SUCCEEDED
            ? OrderStatus.PAID
            : OrderStatus.PAYMENT_FAILED),
        paymentRef,
        qrCodeUrl,
        bankInfo,
        loyaltyPointsEarned:
          existingPayment.status === PaymentStatus.SUCCEEDED
            ? Math.floor(Number(existingPayment.amount) / 10000)
            : 0,
        idempotentReplayed: true,
        createdAt: existingPayment.createdAt,
      };
    }

    // 2. Kiểm tra Idempotency trong phiên chờ quét mã VietQR
    const pendingOrderId = this.idempotencyKeyToOrder.get(idempotencyKey);
    if (pendingOrderId && !dto.simulateScenario) {
      const existingSession = this.pendingSessionsByOrder.get(pendingOrderId);
      if (existingSession) {
        return {
          id: existingSession.sessionId,
          orderId: existingSession.orderId,
          idempotencyKey: existingSession.idempotencyKey,
          amount: existingSession.amount,
          method: existingSession.method,
          status: 'PENDING',
          orderStatus: OrderStatus.PENDING,
          paymentRef: existingSession.paymentRef,
          qrCodeUrl: existingSession.qrCodeUrl,
          bankInfo: existingSession.bankInfo,
          loyaltyPointsEarned: 0,
          idempotentReplayed: true,
          createdAt: existingSession.createdAt,
        };
      }
    }

    // 3. Truy vấn thông tin đơn hàng
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payment: true,
        orderItems: {
          include: {
            product: {
              include: {
                recipeItems: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng với mã: ${dto.orderId}`,
      );
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thanh toán đơn hàng của người dùng khác',
      );
    }

    const orderAmount = Number(order.total);
    const paymentRef = generatePaymentRef(order.id);
    const qrCodeUrl = buildVietQrUrl({
      bankId: bankInfo.bankId,
      accountNo: bankInfo.accountNo,
      accountName: bankInfo.accountName,
      template: bankInfo.template,
      amount: orderAmount,
      paymentRef,
    });

    // Nếu đơn hàng đã được thanh toán thành công trước đó -> trả về kết quả cũ (chống thanh toán trùng đơn)
    if (
      order.status === OrderStatus.PAID &&
      order.payment?.status === PaymentStatus.SUCCEEDED
    ) {
      return {
        id: order.payment.id,
        orderId: order.id,
        idempotencyKey: order.payment.idempotencyKey,
        amount: Number(order.payment.amount),
        method: order.payment.method,
        status: PaymentStatus.SUCCEEDED,
        orderStatus: OrderStatus.PAID,
        paymentRef,
        qrCodeUrl,
        bankInfo,
        loyaltyPointsEarned: Math.floor(orderAmount / 10000),
        idempotentReplayed: true,
        createdAt: order.payment.createdAt,
      };
    }

    const rawMethod = (dto.method || '').trim().toUpperCase();

    // 4. Kiểm tra kịch bản lỗi mô phỏng (MOCK_FAIL hoặc Gateway Timeout đuôi 99)
    const isTimeoutScenario =
      dto.simulateScenario === 'TIMEOUT' ||
      rawMethod === 'TIMEOUT' ||
      Math.round(orderAmount) % 100 === 99;

    const isMockFailScenario =
      dto.simulateScenario === 'MOCK_FAIL' || rawMethod === 'MOCK_FAIL';

    const normalizedMethod =
      rawMethod === 'MOCK_FAIL' || rawMethod === 'TIMEOUT'
        ? PaymentMethod.WALLET
        : this.normalizePaymentMethod(rawMethod);

    if (isTimeoutScenario) {
      await this.failPaymentAndRollbackOrder(
        order,
        normalizedMethod,
        idempotencyKey,
      );
      throw new GatewayTimeoutException({
        statusCode: 504,
        status: PaymentStatus.FAILED,
        orderStatus: OrderStatus.PAYMENT_FAILED,
        message:
          'Dịch vụ thanh toán tạm thời không phản hồi (Gateway Timeout). Đã hoàn trả tồn kho đồ uống.',
      });
    }

    if (isMockFailScenario) {
      await this.failPaymentAndRollbackOrder(
        order,
        normalizedMethod,
        idempotencyKey,
      );
      throw new BadRequestException({
        statusCode: 400,
        status: PaymentStatus.FAILED,
        orderStatus: OrderStatus.PAYMENT_FAILED,
        message:
          'Thanh toán không thành công: Tài khoản không đủ số dư hoặc giao dịch bị từ chối. Đã hoàn trả tồn kho.',
      });
    }

    // 5. Nếu yêu cầu mô phỏng hoàn tất tức thì (simulateScenario === 'SUCCESS')
    if (dto.simulateScenario === 'SUCCESS') {
      return this.settleOrderPaymentSuccess({
        orderId: order.id,
        userId: order.userId,
        amount: orderAmount,
        method: normalizedMethod,
        idempotencyKey,
        paymentRef,
        qrCodeUrl,
        bankInfo,
        transactionRef: `SIM-${paymentRef}`,
      });
    }

    // 6. Chế độ mặc định (khi chọn WALLET hoặc CARD): Mở phiên chờ quét mã QR VietQR (SePay Sandbox Webhook + Polling)
    const session: PendingPaymentSession = {
      sessionId: `pending-${randomUUID()}`,
      orderId: order.id,
      userId: order.userId,
      idempotencyKey,
      method: normalizedMethod,
      amount: orderAmount,
      paymentRef,
      qrCodeUrl,
      bankInfo,
      createdAt: new Date(),
    };

    this.pendingSessionsByOrder.set(order.id, session);
    this.idempotencyKeyToOrder.set(idempotencyKey, order.id);

    return {
      id: session.sessionId,
      orderId: order.id,
      idempotencyKey,
      amount: orderAmount,
      method: normalizedMethod,
      status: 'PENDING',
      orderStatus: OrderStatus.PENDING,
      paymentRef,
      qrCodeUrl,
      bankInfo,
      loyaltyPointsEarned: 0,
      idempotentReplayed: false,
      createdAt: session.createdAt,
    };
  }

  /**
   * Xử lý Webhook từ SePay (POST /payments/sepay-webhook)
   * Đảm bảo Idempotency chiều Webhook: nếu SePay gửi lặp lại cùng giao dịch, bỏ qua xử lý và trả về 200 OK
   */
  async handleSepayWebhook(payload: SepayWebhookDto) {
    const externalTxId =
      payload.id !== undefined && payload.id !== null
        ? String(payload.id).trim()
        : '';

    if (externalTxId && this.processedWebhookTxIds.has(externalTxId)) {
      return {
        success: true,
        idempotentReplayed: true,
        message: 'Giao dịch SePay đã được xử lý trước đó',
      };
    }

    const transferType = String(
      payload.transferType ?? payload.transfer_type ?? 'in',
    ).toLowerCase();

    if (transferType !== 'in') {
      return {
        success: true,
        ignored: true,
        message: 'Bỏ qua giao dịch chuyển tiền ra (out)',
      };
    }

    const rawContent =
      payload.content || payload.transaction_content || payload.code || '';
    const extractedRef =
      extractPaymentRef(payload.code) ||
      extractPaymentRef(payload.content) ||
      extractPaymentRef(payload.transaction_content);

    if (!extractedRef) {
      return {
        success: false,
        ignored: true,
        message:
          'Không tìm thấy mã tham chiếu đơn hàng BREW... trong nội dung chuyển khoản',
      };
    }

    const order = await this.findOrderByPaymentRef(extractedRef, rawContent);
    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng khớp với mã tham chiếu ${extractedRef}`,
      );
    }

    const orderAmount = Number(order.total);
    const transferAmount = Number(
      payload.transferAmount ?? payload.amount_in ?? orderAmount,
    );

    // Nếu đơn đã PAID trong DB -> trả về thành công ngay (Idempotency)
    if (
      order.status === OrderStatus.PAID &&
      order.payment?.status === PaymentStatus.SUCCEEDED
    ) {
      if (externalTxId) {
        this.processedWebhookTxIds.add(externalTxId);
      }
      return {
        success: true,
        idempotentReplayed: true,
        orderId: order.id,
        status: PaymentStatus.SUCCEEDED,
        orderStatus: OrderStatus.PAID,
      };
    }

    if (transferAmount < orderAmount) {
      throw new BadRequestException(
        `Số tiền chuyển khoản (${transferAmount.toLocaleString('vi-VN')}đ) nhỏ hơn tổng tiền đơn hàng (${orderAmount.toLocaleString('vi-VN')}đ)`,
      );
    }

    const pendingSession = this.pendingSessionsByOrder.get(order.id);
    const bankInfo =
      pendingSession?.bankInfo ||
      (await this.sepaySandboxClient.resolveVietQrBankConfig());
    const paymentRef = generatePaymentRef(order.id);
    const qrCodeUrl =
      pendingSession?.qrCodeUrl ||
      buildVietQrUrl({
        bankId: bankInfo.bankId,
        accountNo: bankInfo.accountNo,
        accountName: bankInfo.accountName,
        template: bankInfo.template,
        amount: orderAmount,
        paymentRef,
      });

    const idempotencyKey =
      pendingSession?.idempotencyKey ||
      (externalTxId ? `sepay-tx-${externalTxId}` : `sepay-order-${order.id}`);
    const method = pendingSession?.method || PaymentMethod.WALLET;

    const settled = await this.settleOrderPaymentSuccess({
      orderId: order.id,
      userId: order.userId,
      amount: orderAmount,
      method,
      idempotencyKey,
      paymentRef,
      qrCodeUrl,
      bankInfo,
      transactionRef:
        externalTxId ||
        payload.referenceCode ||
        payload.reference_number ||
        paymentRef,
    });

    if (externalTxId) {
      this.processedWebhookTxIds.add(externalTxId);
    }

    return {
      success: true,
      idempotentReplayed: settled.idempotentReplayed,
      orderId: settled.orderId,
      paymentId: settled.id,
      status: settled.status,
      orderStatus: settled.orderStatus,
      loyaltyPointsEarned: settled.loyaltyPointsEarned,
    };
  }

  /**
   * Cơ chế Polling kép (GET /payments/order/:orderId/status):
   * 1. Kiểm tra trạng thái Order & Payment trong PostgreSQL (nếu Webhook đã tới)
   * 2. Nếu Order vẫn PENDING và có SEPAY_API_TOKEN, chủ động gọi GET https://userapi-sandbox.sepay.vn/v2/transactions
   *    để đối soát giao dịch tiền vào khớp mã BREW... và tự động chốt đơn PAID
   */
  async pollPaymentStatusByOrder(
    orderId: string,
    userId?: string,
  ): Promise<PaymentResultResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng: ${orderId}`);
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập trạng thái thanh toán của đơn hàng này',
      );
    }

    const orderAmount = Number(order.total);
    const pendingSession = this.pendingSessionsByOrder.get(order.id);
    const bankInfo =
      pendingSession?.bankInfo ||
      (await this.sepaySandboxClient.resolveVietQrBankConfig());
    const paymentRef = generatePaymentRef(order.id);
    const qrCodeUrl =
      pendingSession?.qrCodeUrl ||
      buildVietQrUrl({
        bankId: bankInfo.bankId,
        accountNo: bankInfo.accountNo,
        accountName: bankInfo.accountName,
        template: bankInfo.template,
        amount: orderAmount,
        paymentRef,
      });

    // Nếu đơn đã có kết quả Payment trong DB (SUCCEEDED hoặc FAILED)
    if (order.payment && order.status !== OrderStatus.PENDING) {
      return {
        id: order.payment.id,
        orderId: order.id,
        idempotencyKey: order.payment.idempotencyKey,
        amount: Number(order.payment.amount),
        method: order.payment.method,
        status: order.payment.status,
        orderStatus: order.status,
        paymentRef,
        qrCodeUrl,
        bankInfo,
        loyaltyPointsEarned:
          order.payment.status === PaymentStatus.SUCCEEDED
            ? Math.floor(orderAmount / 10000)
            : 0,
        idempotentReplayed: false,
        createdAt: order.payment.createdAt,
      };
    }

    // Nếu đơn đang PENDING -> chủ động đối soát trên SePay Sandbox API v2 (/v2/transactions)
    const matchedTx =
      await this.sepaySandboxClient.findMatchingIncomingTransaction(
        paymentRef,
        orderAmount,
      );

    if (matchedTx) {
      this.logger.log(
        `Polling SePay Sandbox khớp giao dịch ${matchedTx.id} cho đơn ${order.id} (${paymentRef})`,
      );
      const idempotencyKey =
        pendingSession?.idempotencyKey || `sepay-poll-${matchedTx.id}`;
      const method = pendingSession?.method || PaymentMethod.WALLET;

      const settled = await this.settleOrderPaymentSuccess({
        orderId: order.id,
        userId: order.userId,
        amount: orderAmount,
        method,
        idempotencyKey,
        paymentRef,
        qrCodeUrl,
        bankInfo,
        transactionRef: matchedTx.referenceNumber || matchedTx.id,
      });

      this.processedWebhookTxIds.add(matchedTx.id);
      return settled;
    }

    return {
      id: pendingSession?.sessionId || `pending-${order.id}`,
      orderId: order.id,
      idempotencyKey: pendingSession?.idempotencyKey || '',
      amount: orderAmount,
      method: pendingSession?.method || PaymentMethod.WALLET,
      status: 'PENDING',
      orderStatus: order.status,
      paymentRef,
      qrCodeUrl,
      bankInfo,
      loyaltyPointsEarned: 0,
      idempotentReplayed: false,
      createdAt: pendingSession?.createdAt || order.createdAt,
    };
  }

  /**
   * Giả lập SePay Sandbox Webhook (POST /payments/sepay-webhook/simulate)
   * Hỗ trợ kích hoạt nhanh trên giao diện Sandbox và CI/CD E2E Test
   */
  async simulateSepayWebhook(dto: SimulateSepayWebhookDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payment: true,
        orderItems: {
          include: {
            product: {
              include: {
                recipeItems: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng: ${dto.orderId}`);
    }

    const pendingSession = this.pendingSessionsByOrder.get(order.id);
    const method = dto.method
      ? this.normalizePaymentMethod(dto.method)
      : pendingSession?.method || PaymentMethod.WALLET;
    const idempotencyKey =
      dto.idempotencyKey ||
      pendingSession?.idempotencyKey ||
      `sim-webhook-${order.id}`;

    if (dto.scenario === 'MOCK_FAIL') {
      await this.failPaymentAndRollbackOrder(order, method, idempotencyKey);
      throw new BadRequestException({
        statusCode: 400,
        status: PaymentStatus.FAILED,
        orderStatus: OrderStatus.PAYMENT_FAILED,
        message:
          'Giả lập thanh toán thất bại: Giao dịch bị từ chối và đã hoàn trả tồn kho.',
      });
    }

    if (dto.scenario === 'TIMEOUT') {
      await this.failPaymentAndRollbackOrder(order, method, idempotencyKey);
      throw new GatewayTimeoutException({
        statusCode: 504,
        status: PaymentStatus.FAILED,
        orderStatus: OrderStatus.PAYMENT_FAILED,
        message:
          'Giả lập lỗi nghẽn mạng (Gateway Timeout): Đã hủy giao dịch và hoàn trả tồn kho.',
      });
    }

    const paymentRef = generatePaymentRef(order.id);
    const transferAmount = dto.transferAmount ?? Number(order.total);

    return this.handleSepayWebhook({
      id: `sim-sepay-${order.id}`,
      gateway: 'MBBank',
      transferType: 'in',
      transferAmount,
      code: paymentRef,
      content: `${paymentRef} chuyen khoan thanh toan BrewLite`,
      referenceCode: `FT-SIM-${paymentRef}`,
    });
  }

  /**
   * Lấy danh sách tài khoản ngân hàng từ SePay Test mode API v2
   */
  async getSandboxBankAccounts() {
    const accounts = await this.sepaySandboxClient.listBankAccounts();
    const resolvedConfig =
      await this.sepaySandboxClient.resolveVietQrBankConfig();
    return {
      status: 'success',
      activeVietQrConfig: resolvedConfig,
      data: accounts,
    };
  }

  /**
   * Tìm Order từ mã tham chiếu paymentRef (BREW...) mà không cần thêm cột vào bảng Order/Payment
   */
  private async findOrderByPaymentRef(
    paymentRef: string,
    rawContent: string,
  ) {
    // 1. Tìm nhanh trong danh sách phiên chờ trên RAM
    for (const session of this.pendingSessionsByOrder.values()) {
      if (session.paymentRef === paymentRef.toUpperCase()) {
        const order = await this.prisma.order.findUnique({
          where: { id: session.orderId },
          include: { payment: true },
        });
        if (order) {
          return order;
        }
      }
    }

    // 2. Đối chiếu trực tiếp trên các đơn hàng trong PostgreSQL
    const candidates = await this.prisma.order.findMany({
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return (
      candidates.find(
        (o) =>
          matchesPaymentRef(o.id, paymentRef) ||
          rawContent.toLowerCase().includes(o.id.toLowerCase()),
      ) ?? null
    );
  }

  /**
   * Thực thi Database Transaction chốt thanh toán thành công:
   * - Lưu bản ghi Payment (status = SUCCEEDED, method = WALLET | CARD, idempotencyKey)
   * - Chuyển Order sang PAID
   * - Ghi nhận LoyaltyTransaction & cộng điểm thưởng cho User
   */
  private async settleOrderPaymentSuccess(params: {
    orderId: string;
    userId: string;
    amount: number;
    method: PaymentMethod;
    idempotencyKey: string;
    paymentRef: string;
    qrCodeUrl: string;
    bankInfo: VietQrBankInfo;
    transactionRef?: string;
  }): Promise<PaymentResultResponse> {
    const pointsEarned = Math.floor(params.amount / 10000);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Kiểm tra lại trong transaction để chống Race Condition
        const existingByKey = await tx.payment.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (
          existingByKey &&
          existingByKey.status === PaymentStatus.SUCCEEDED
        ) {
          return {
            payment: existingByKey,
            idempotentReplayed: true,
          };
        }

        const existingByOrder = await tx.payment.findUnique({
          where: { orderId: params.orderId },
        });
        if (
          existingByOrder &&
          existingByOrder.status === PaymentStatus.SUCCEEDED
        ) {
          return {
            payment: existingByOrder,
            idempotentReplayed: true,
          };
        }

        const payment = existingByOrder
          ? await tx.payment.update({
              where: { orderId: params.orderId },
              data: {
                idempotencyKey: params.idempotencyKey,
                amount: params.amount,
                method: params.method,
                status: PaymentStatus.SUCCEEDED,
              },
            })
          : await tx.payment.create({
              data: {
                orderId: params.orderId,
                idempotencyKey: params.idempotencyKey,
                amount: params.amount,
                method: params.method,
                status: PaymentStatus.SUCCEEDED,
              },
            });

        await tx.order.update({
          where: { id: params.orderId },
          data: {
            status: OrderStatus.PAID,
          },
        });

        if (pointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: params.userId,
              orderId: params.orderId,
              points: pointsEarned,
              description: `Tích điểm thanh toán đơn hàng #${params.paymentRef}`,
            },
          });

          await tx.user.update({
            where: { id: params.userId },
            data: {
              loyaltyPoints: {
                increment: pointsEarned,
              },
            },
          });
        }

        return {
          payment,
          idempotentReplayed: false,
        };
      });

      this.pendingSessionsByOrder.delete(params.orderId);

      return {
        id: result.payment.id,
        orderId: params.orderId,
        idempotencyKey: result.payment.idempotencyKey,
        amount: Number(result.payment.amount),
        method: result.payment.method,
        status: PaymentStatus.SUCCEEDED,
        orderStatus: OrderStatus.PAID,
        paymentRef: params.paymentRef,
        qrCodeUrl: params.qrCodeUrl,
        bankInfo: params.bankInfo,
        loyaltyPointsEarned: pointsEarned,
        idempotentReplayed: result.idempotentReplayed,
        transactionRef: params.transactionRef,
        createdAt: result.payment.createdAt,
      };
    } catch (error) {
      // Bắt lỗi Unique Constraint P2002 khi có 2 request đồng thời cùng Idempotency-Key hoặc orderId
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        const existing =
          (await this.prisma.payment.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          })) ||
          (await this.prisma.payment.findUnique({
            where: { orderId: params.orderId },
          }));

        if (existing) {
          return {
            id: existing.id,
            orderId: existing.orderId,
            idempotencyKey: existing.idempotencyKey,
            amount: Number(existing.amount),
            method: existing.method,
            status: existing.status,
            orderStatus:
              existing.status === PaymentStatus.SUCCEEDED
                ? OrderStatus.PAID
                : OrderStatus.PAYMENT_FAILED,
            paymentRef: params.paymentRef,
            qrCodeUrl: params.qrCodeUrl,
            bankInfo: params.bankInfo,
            loyaltyPointsEarned: pointsEarned,
            idempotentReplayed: true,
            transactionRef: params.transactionRef,
            createdAt: existing.createdAt,
          };
        }
      }
      throw error;
    }
  }

  /**
   * Thực thi Database Transaction khi thanh toán thất bại hoặc Timeout:
   * - Lưu bản ghi Payment (status = FAILED)
   * - Chuyển Order sang PAYMENT_FAILED
   * - Hoàn trả số lượng nguyên liệu tồn kho (Ingredient.stockQuantity) & lượt dùng Promotion
   */
  private async failPaymentAndRollbackOrder(
    order: {
      id: string;
      status: OrderStatus;
      total: unknown;
      promotionId?: string | null;
      payment?: { id: string; status: PaymentStatus } | null;
      orderItems?: Array<{
        quantity: number;
        product?: {
          recipeItems?: Array<{
            ingredientId: string;
            quantityRequired: unknown;
          }>;
        } | null;
      }>;
    },
    method: PaymentMethod,
    idempotencyKey: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (order.payment) {
        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            idempotencyKey,
            method,
            status: PaymentStatus.FAILED,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey,
            amount: Number(order.total),
            method,
            status: PaymentStatus.FAILED,
          },
        });
      }

      // Chỉ hoàn trả tồn kho & voucher nếu đơn đang ở trạng thái PENDING (tránh hoàn kho 2 lần)
      if (order.status === OrderStatus.PENDING) {
        const ingredientRestoreMap = new Map<string, number>();

        for (const item of order.orderItems ?? []) {
          for (const recipe of item.product?.recipeItems ?? []) {
            const qtyToRestore =
              Number(recipe.quantityRequired) * item.quantity;
            if (qtyToRestore > 0) {
              ingredientRestoreMap.set(
                recipe.ingredientId,
                (ingredientRestoreMap.get(recipe.ingredientId) ?? 0) +
                  qtyToRestore,
              );
            }
          }
        }

        for (const [ingredientId, restoreQty] of ingredientRestoreMap.entries()) {
          await tx.ingredient.updateMany({
            where: { id: ingredientId },
            data: {
              stockQuantity: { increment: restoreQty },
              version: { increment: 1 },
            },
          });
        }

        if (order.promotionId) {
          await tx.promotion.updateMany({
            where: {
              id: order.promotionId,
              usedCount: { gt: 0 },
            },
            data: {
              usedCount: { decrement: 1 },
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAYMENT_FAILED,
        },
      });
    });

    this.pendingSessionsByOrder.delete(order.id);
  }
}

