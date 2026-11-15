import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus, ProductSize } from '@prisma/client';
import * as request from 'supertest';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { LoginDto } from './modules/auth/dto/login.dto';
import { RegisterDto } from './modules/auth/dto/register.dto';
import { JwtStrategy } from './modules/auth/strategies/jwt.strategy';
import { ProductsController } from './modules/products/products.controller';
import { ProductsModule } from './modules/products/products.module';
import { OrdersController } from './modules/orders/orders.controller';
import { OrdersModule } from './modules/orders/orders.module';
import { CreateOrderDto } from './modules/orders/dto/create-order.dto';
import { PaymentsController } from './modules/payments/payments.controller';
import { PaymentsModule } from './modules/payments/payments.module';
import { SepaySandboxClient } from './modules/payments/sepay-sandbox.client';

describe('Core End-to-End Business Flow (6 Steps: Menu -> Customize -> Cart/Price -> Auth & Order -> Payment Idempotency -> Tracking)', () => {
  let productsController: ProductsController;
  let authController: AuthController;
  let ordersController: OrdersController;
  let paymentsController: PaymentsController;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let validationPipe: ValidationPipe;
  let app: INestApplication;

  // Stateful In-Memory Database cho kiểm thử xuyên suốt 6 bước
  const dbUsers = new Map<string, any>();
  const dbIngredients = new Map<string, any>();
  const dbProducts = new Map<string, any>();
  const dbToppings = new Map<string, any>();
  const dbPromotions = new Map<string, any>();
  const dbOrders = new Map<string, any>();
  const dbPayments = new Map<string, any>();
  const dbLoyaltyTxs: any[] = [];

  function seedInitialData() {
    dbUsers.clear();
    dbIngredients.clear();
    dbProducts.clear();
    dbToppings.clear();
    dbPromotions.clear();
    dbOrders.clear();
    dbPayments.clear();
    dbLoyaltyTxs.length = 0;

    dbIngredients.set('ing-coffee', {
      id: 'ing-coffee',
      name: 'Hạt cà phê Robusta',
      unit: 'GRAM',
      stockQuantity: 100, // Đủ pha tối đa 5 ly (mỗi ly 20g)
      version: 1,
    });

    dbIngredients.set('ing-milk', {
      id: 'ing-milk',
      name: 'Sữa đặc nguyên kem',
      unit: 'ML',
      stockQuantity: 150, // Đủ pha tối đa 5 ly (mỗi ly 30ml)
      version: 1,
    });

    dbProducts.set('prod-cf-sua', {
      id: 'prod-cf-sua',
      name: 'Cà phê Sữa Đá Sài Gòn',
      price: 29000,
      imageUrl: 'https://example.com/cf-sua.jpg',
      isAvailable: true,
      recipeItems: [
        {
          id: 'rec-1',
          productId: 'prod-cf-sua',
          ingredientId: 'ing-coffee',
          quantityRequired: 20,
          get ingredient() {
            return dbIngredients.get('ing-coffee');
          },
        },
        {
          id: 'rec-2',
          productId: 'prod-cf-sua',
          ingredientId: 'ing-milk',
          quantityRequired: 30,
          get ingredient() {
            return dbIngredients.get('ing-milk');
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dbProducts.set('prod-tra-dao', {
      id: 'prod-tra-dao',
      name: 'Trà Đào Cam Sả',
      price: 35000,
      imageUrl: 'https://example.com/tra-dao.jpg',
      isAvailable: true,
      recipeItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dbToppings.set('top-pearl', {
      id: 'top-pearl',
      name: 'Trân châu đường đen',
      price: 10000,
      isAvailable: true,
    });

    dbToppings.set('top-cheese', {
      id: 'top-cheese',
      name: 'Kem Cheese Macchiato',
      price: 12000,
      isAvailable: true,
    });

    dbPromotions.set('WELCOME10', {
      id: 'promo-welcome10',
      code: 'WELCOME10',
      discountValue: 10000,
      minOrderAmount: 50000,
      isActive: true,
      usageLimit: 100,
      usedCount: 0,
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 86400000 * 30),
    });
  }

  const statefulPrismaMock: any = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn().mockImplementation(async (callback: any) => {
      return callback(statefulPrismaMock);
    }),
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.email) {
          return dbUsers.get(where.email.toLowerCase()) ?? null;
        }
        if (where.id) {
          for (const u of dbUsers.values()) {
            if (u.id === where.id) return u;
          }
        }
        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const user = {
          id: `user-${dbUsers.size + 1}`,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          loyaltyPoints: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbUsers.set(user.email, user);
        return user;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const u of dbUsers.values()) {
          if (u.id === where.id) {
            if (data.loyaltyPoints?.increment) {
              u.loyaltyPoints += data.loyaltyPoints.increment;
            }
            return u;
          }
        }
        return null;
      }),
    },
    product: {
      findMany: jest.fn().mockImplementation(async ({ where } = {}) => {
        const all = Array.from(dbProducts.values());
        if (where?.id?.in) {
          return all.filter((p) => where.id.in.includes(p.id));
        }
        return all;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return dbProducts.get(where.id) ?? null;
      }),
    },
    topping: {
      findMany: jest.fn().mockImplementation(async ({ where } = {}) => {
        const all = Array.from(dbToppings.values());
        if (where?.id?.in) {
          return all.filter((t) => where.id.in.includes(t.id));
        }
        if (where?.isAvailable !== undefined) {
          return all.filter((t) => t.isAvailable === where.isAvailable);
        }
        return all;
      }),
    },
    ingredient: {
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        const ing = dbIngredients.get(where.id);
        if (!ing) return { count: 0 };
        if (where.version !== undefined && ing.version !== where.version) {
          return { count: 0 };
        }
        if (
          where.stockQuantity?.gte !== undefined &&
          ing.stockQuantity < where.stockQuantity.gte
        ) {
          return { count: 0 };
        }
        if (data.stockQuantity?.decrement) {
          ing.stockQuantity -= data.stockQuantity.decrement;
        }
        if (data.stockQuantity?.increment) {
          ing.stockQuantity += data.stockQuantity.increment;
        }
        if (data.version?.increment) {
          ing.version += data.version.increment;
        }
        return { count: 1 };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const ing = dbIngredients.get(where.id);
        if (!ing) return null;
        if (data.stockQuantity?.increment) {
          ing.stockQuantity += data.stockQuantity.increment;
        }
        if (data.version?.increment) {
          ing.version += data.version.increment;
        }
        return ing;
      }),
    },
    promotion: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return dbPromotions.get(where.code) ?? null;
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const promo of dbPromotions.values()) {
          if (promo.id === where.id && promo.isActive) {
            if (data.usedCount?.increment) {
              promo.usedCount += data.usedCount.increment;
            }
            return { count: 1 };
          }
        }
        return { count: 0 };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const promo of dbPromotions.values()) {
          if (promo.id === where.id) {
            if (data.usedCount?.decrement) {
              promo.usedCount = Math.max(0, promo.usedCount - data.usedCount.decrement);
            }
            return promo;
          }
        }
        return null;
      }),
    },
    order: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const orderId = `ord-e2e-${dbOrders.size + 1}`;
        const rawItems = data.orderItems?.create ?? [];
        const createdItems = rawItems.map((item: any, idx: number) => {
          const product = dbProducts.get(item.productId);
          const connectedToppings = (item.toppings?.connect ?? []).map((c: any) =>
            dbToppings.get(c.id),
          );
          return {
            id: `oi-${idx + 1}`,
            orderId,
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            product: product
              ? {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  imageUrl: product.imageUrl,
                  recipeItems: product.recipeItems,
                }
              : null,
            toppings: connectedToppings.filter(Boolean),
          };
        });

        const orderRecord = {
          id: orderId,
          userId: data.userId,
          status: data.status ?? OrderStatus.PENDING,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          total: data.total,
          promotionId: data.promotionId ?? null,
          orderItems: createdItems,
          get payment() {
            for (const p of dbPayments.values()) {
              if (p.orderId === orderId) return p;
            }
            return null;
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbOrders.set(orderId, orderRecord);
        return orderRecord;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return dbOrders.get(where.id) ?? null;
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        const ord = dbOrders.get(where.id);
        if (!ord) return null;
        if (where.userId && ord.userId !== where.userId) return null;
        return ord;
      }),
      findMany: jest.fn().mockImplementation(async ({ where } = {}) => {
        const list = Array.from(dbOrders.values());
        if (where?.userId) {
          return list.filter((o) => o.userId === where.userId);
        }
        return list;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const ord = dbOrders.get(where.id);
        if (!ord) return null;
        if (data.status) ord.status = data.status;
        ord.updatedAt = new Date();
        return ord;
      }),
    },
    payment: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.idempotencyKey) {
          for (const p of dbPayments.values()) {
            if (p.idempotencyKey === where.idempotencyKey) {
              return { ...p, order: dbOrders.get(p.orderId) };
            }
          }
        }
        if (where.orderId) {
          for (const p of dbPayments.values()) {
            if (p.orderId === where.orderId) {
              return { ...p, order: dbOrders.get(p.orderId) };
            }
          }
        }
        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const payment = {
          id: `pay-${dbPayments.size + 1}`,
          orderId: data.orderId,
          idempotencyKey: data.idempotencyKey,
          amount: data.amount,
          method: data.method,
          status: data.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbPayments.set(payment.id, payment);
        return payment;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const p of dbPayments.values()) {
          if (p.orderId === where.orderId) {
            Object.assign(p, data, { updatedAt: new Date() });
            return p;
          }
        }
        return null;
      }),
      upsert: jest.fn().mockImplementation(async ({ where, create, update }) => {
        for (const p of dbPayments.values()) {
          if (p.orderId === where.orderId) {
            Object.assign(p, update, { updatedAt: new Date() });
            return p;
          }
        }
        const payment = {
          id: `pay-${dbPayments.size + 1}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbPayments.set(payment.id, payment);
        return payment;
      }),
    },
    loyaltyTransaction: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const tx = {
          id: `loy-${dbLoyaltyTxs.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        dbLoyaltyTxs.push(tx);
        return tx;
      }),
    },
  };

  const mockSepayClient = {
    resolveVietQrBankConfig: jest.fn().mockResolvedValue({
      bankId: 'MB',
      accountNo: '0000000001',
      accountName: 'BrewLite',
      template: 'compact2',
      source: 'ENV_FALLBACK',
    }),
    findMatchingIncomingTransaction: jest.fn().mockResolvedValue(null),
    listBankAccounts: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    seedInitialData();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        ProductsModule,
        OrdersModule,
        PaymentsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(statefulPrismaMock)
      .overrideProvider(SepaySandboxClient)
      .useValue(mockSepayClient)
      .compile();

    productsController = moduleRef.get<ProductsController>(ProductsController);
    authController = moduleRef.get<AuthController>(AuthController);
    ordersController = moduleRef.get<OrdersController>(OrdersController);
    paymentsController = moduleRef.get<PaymentsController>(PaymentsController);
    jwtService = moduleRef.get<JwtService>(JwtService);
    jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);

    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(validationPipe);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Thực thi trọn vẹn 6 bước Luồng Nghiệp Vụ Chính (Core E2E Flow) từ Xem Menu -> Chọn Size/Topping -> Đăng ký/Đăng nhập JWT -> Đặt đơn Transaction -> Thanh toán VietQR/Idempotency -> Theo dõi đơn hàng', async () => {
    // =========================================================================
    // BƯỚC 1: XEM MENU (GET /products & GET /products/toppings)
    // =========================================================================
    const menuProducts = await productsController.findAll();
    expect(menuProducts).toHaveLength(2);
    const cfSua = menuProducts.find((p) => p.id === 'prod-cf-sua')!;
    expect(cfSua.name).toBe('Cà phê Sữa Đá Sài Gòn');
    expect(cfSua.price).toBe(29000);
    expect(cfSua.isAvailable).toBe(true);
    // Tồn kho: 100g cà phê / 20g = 5 ly, 150ml sữa / 30ml = 5 ly -> maxAvailableQuantity = 5
    expect(cfSua.maxAvailableQuantity).toBe(5);

    const toppings = await productsController.findAllToppings();
    expect(toppings).toHaveLength(2);
    expect(toppings[0].name).toBe('Trân châu đường đen');

    // =========================================================================
    // BƯỚC 2: XEM CHI TIẾT & TÙY CHỌN (GET /products/:id)
    // =========================================================================
    const productDetail = await productsController.findOne('prod-cf-sua');
    expect(productDetail.id).toBe('prod-cf-sua');
    expect(productDetail.recipeItems).toHaveLength(2);

    await expect(productsController.findOne('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );

    // =========================================================================
    // BƯỚC 3 & 4: XÁC THỰC JWT (ĐĂNG KÝ -> ĐĂNG NHẬP) & ĐẶT ĐƠN (POST /orders)
    // =========================================================================
    // 4.1. Đăng ký tài khoản mới
    const registerDto = await validationPipe.transform(
      {
        email: '  KhachHangE2E@BrewLite.vn ',
        password: 'password123',
      },
      { type: 'body', metatype: RegisterDto },
    );
    const regRes = await authController.register(registerDto);
    expect(regRes.user.email).toBe('khachhange2e@brewlite.vn');

    // 4.2. Đăng nhập nhận JWT
    const loginDto = await validationPipe.transform(
      {
        email: 'khachhange2e@brewlite.vn',
        password: 'password123',
      },
      { type: 'body', metatype: LoginDto },
    );
    const loginRes = await authController.login(loginDto);
    expect(loginRes.accessToken).toBeDefined();

    // Giải mã và xác thực JWT qua JwtStrategy
    const decodedJwt = jwtService.verify(loginRes.accessToken);
    const authenticatedUser = await jwtStrategy.validate(decodedJwt);
    expect(authenticatedUser.email).toBe('khachhange2e@brewlite.vn');

    // 4.3. Đặt đơn hàng: 2 ly Cà phê Sữa Đá Size M (+6.000đ) + Topping Trân châu (+10.000đ) + Mã giảm giá WELCOME10 (-10.000đ)
    // Đơn giá 1 ly = 29.000 + 6.000 + 10.000 = 45.000đ -> 2 ly = 90.000đ -> Giảm 10.000đ = 80.000đ
    const createOrderDto = await validationPipe.transform(
      {
        items: [
          {
            productId: 'prod-cf-sua',
            size: ProductSize.M,
            quantity: 2,
            toppingIds: ['top-pearl'],
          },
        ],
        promotionCode: 'WELCOME10',
      },
      { type: 'body', metatype: CreateOrderDto },
    );

    const createdOrder = await ordersController.create(
      { user: authenticatedUser } as any,
      createOrderDto,
    );

    expect(createdOrder.status).toBe(OrderStatus.PENDING);
    expect(createdOrder.subtotal).toBe(90000);
    expect(createdOrder.discountAmount).toBe(10000);
    expect(createdOrder.total).toBe(80000);
    expect(createdOrder.orderItems).toHaveLength(1);
    expect(createdOrder.orderItems[0].size).toBe(ProductSize.M);
    expect(createdOrder.orderItems[0].toppings[0].name).toBe('Trân châu đường đen');

    // Kiểm tra tồn kho nguyên liệu đã bị trừ trong Transaction (100 - 40 = 60g, version tăng từ 1 -> 2)
    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(60);
    expect(dbIngredients.get('ing-coffee').version).toBe(2);
    expect(dbIngredients.get('ing-milk').stockQuantity).toBe(90);
    expect(dbPromotions.get('WELCOME10').usedCount).toBe(1);

    // =========================================================================
    // BƯỚC 5: THANH TOÁN (POST /payments) & CHỐNG TRÙNG LẶP IDEMPOTENCY
    // =========================================================================
    // 5.1. Chặn nếu thiếu Idempotency-Key
    await expect(
      paymentsController.createPayment(
        { user: authenticatedUser } as any,
        undefined,
        { orderId: createdOrder.id, method: PaymentMethod.WALLET },
      ),
    ).rejects.toThrow(BadRequestException);

    // 5.2. Khởi tạo thanh toán QR (WALLET) với Idempotency-Key
    const idempotencyKey = 'idem-e2e-order-1-wallet';
    const paymentInit = await paymentsController.createPayment(
      { user: authenticatedUser } as any,
      idempotencyKey,
      { orderId: createdOrder.id, method: PaymentMethod.WALLET },
    );

    expect(paymentInit.status).toBe('PENDING');
    expect(paymentInit.orderId).toBe(createdOrder.id);
    expect(paymentInit.amount).toBe(80000);
    expect(paymentInit.qrCodeUrl).toContain('img.vietqr.io/image/MB-0000000001-compact2.png');
    expect(paymentInit.bankInfo.accountNo).toBe('0000000001');
    expect(paymentInit.bankInfo.accountName).toBe('BrewLite');
    expect(paymentInit.paymentRef).toMatch(/^BREW/);
    expect(paymentInit.idempotentReplayed).toBe(false);

    // 5.3. Gửi lại request trùng Idempotency-Key -> trả về đúng phiên cũ (idempotentReplayed = true)
    const paymentRetry = await paymentsController.createPayment(
      { user: authenticatedUser } as any,
      idempotencyKey,
      { orderId: createdOrder.id, method: PaymentMethod.WALLET },
    );
    expect(paymentRetry.id).toBe(paymentInit.id);
    expect(paymentRetry.idempotentReplayed).toBe(true);

    // 5.4. Khách hàng hoàn tất chuyển khoản QR -> SePay Webhook báo về
    const webhookRes = await paymentsController.simulateSepayWebhook({
      orderId: createdOrder.id,
      scenario: 'SUCCESS',
    });

    expect(webhookRes.success).toBe(true);
    expect(webhookRes.status).toBe(PaymentStatus.SUCCEEDED);
    expect(webhookRes.orderStatus).toBe(OrderStatus.PAID);
    // 80.000đ -> tích 8 điểm thưởng
    expect(webhookRes.loyaltyPointsEarned).toBe(8);
    expect(dbUsers.get('khachhange2e@brewlite.vn').loyaltyPoints).toBe(8);

    // 5.5. Nếu client hoặc webhook gọi lại sau khi đơn đã PAID -> Idempotent tuyệt đối, không cộng điểm lần 2
    const postPaidReplay = await paymentsController.createPayment(
      { user: authenticatedUser } as any,
      'another-idem-key-after-paid',
      { orderId: createdOrder.id, method: PaymentMethod.WALLET },
    );
    expect(postPaidReplay.status).toBe(PaymentStatus.SUCCEEDED);
    expect(postPaidReplay.orderStatus).toBe(OrderStatus.PAID);
    expect(postPaidReplay.idempotentReplayed).toBe(true);
    expect(dbUsers.get('khachhange2e@brewlite.vn').loyaltyPoints).toBe(8);

    // =========================================================================
    // BƯỚC 6: XÁC NHẬN & THEO DÕI ĐƠN HÀNG (GET /orders/:id, GET /orders/me, PATCH /orders/:id/status)
    // =========================================================================
    // 6.1. Xem màn hình xác nhận chi tiết đơn hàng (GET /orders/:id)
    const confirmedOrder = await ordersController.findMyOrder(
      { user: authenticatedUser } as any,
      createdOrder.id,
    );
    expect(confirmedOrder.id).toBe(createdOrder.id);
    expect(confirmedOrder.status).toBe(OrderStatus.PAID);
    expect(confirmedOrder.total).toBe(80000);
    expect(confirmedOrder.orderItems[0].product?.name).toBe('Cà phê Sữa Đá Sài Gòn');

    // 6.2. Xem lịch sử đơn hàng đã đặt (GET /orders/me)
    const myOrders = await ordersController.findMyOrdersAlias({
      user: authenticatedUser,
    } as any);
    expect(myOrders).toHaveLength(1);
    expect(myOrders[0].id).toBe(createdOrder.id);
    expect(myOrders[0].status).toBe(OrderStatus.PAID);
    expect(myOrders[0].itemCount).toBe(2);

    // 6.3. Theo dõi chuyển trạng thái đơn hàng theo State Machine: PAID -> PREPARING -> COMPLETED
    const prepOrder = await ordersController.updateStatus(
      createdOrder.id,
      OrderStatus.PREPARING,
    );
    expect(prepOrder.status).toBe(OrderStatus.PREPARING);

    const completedOrder = await ordersController.updateStatus(
      createdOrder.id,
      OrderStatus.COMPLETED,
    );
    expect(completedOrder.status).toBe(OrderStatus.COMPLETED);

    // Chặn chuyển trạng thái ngược từ COMPLETED -> PENDING
    await expect(
      ordersController.updateStatus(createdOrder.id, OrderStatus.PENDING),
    ).rejects.toThrow(BadRequestException);
  });

  it('Kiểm thử kịch bản biên trong Luồng Chính: Đặt quá tồn kho nguyên liệu (409 Conflict) & Thanh toán thất bại tự động hoàn trả tồn kho (Rollback)', async () => {
    const loginRes = await authController.login({
      email: 'khachhange2e@brewlite.vn',
      password: 'password123',
    });
    const decoded = jwtService.verify(loginRes.accessToken);
    const user = await jwtStrategy.validate(decoded);

    // Hiện tại còn 60g cà phê (chỉ đủ pha 3 ly). Nếu đặt 4 ly (cần 80g) -> 409 Conflict kèm outOfStockProductIds
    await expect(
      ordersController.create({ user } as any, {
        items: [{ productId: 'prod-cf-sua', size: ProductSize.S, quantity: 4 }],
      }),
    ).rejects.toThrow(ConflictException);

    // Tồn kho vẫn giữ nguyên 60g
    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(60);

    // Đặt 1 ly hợp lệ (tồn kho giảm từ 60g -> 40g)
    const orderForFail = await ordersController.create({ user } as any, {
      items: [{ productId: 'prod-cf-sua', size: ProductSize.S, quantity: 1 }],
    });
    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(40);

    // Giả lập thanh toán thất bại (MOCK_FAIL) -> Đơn chuyển sang PAYMENT_FAILED và hoàn trả 20g cà phê về 60g
    await expect(
      paymentsController.createPayment(
        { user } as any,
        'idem-fail-rollback-1',
        {
          orderId: orderForFail.id,
          method: PaymentMethod.CARD,
          simulateScenario: 'MOCK_FAIL',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(60);
    const failedOrder = await ordersController.findMyOrder(
      { user } as any,
      orderForFail.id,
    );
    expect(failedOrder.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('Kiểm thử API HTTP xuyên suốt tạo đơn và thanh toán: xác thực, phân quyền, lưu dữ liệu, idempotency, webhook và hoàn kho', async () => {
    const api = request(app.getHttpServer());
    const customerEmail = `api-${Date.now()}@brewlite.vn`;
    const registerResponse = await api.post('/auth/register').send({
      email: customerEmail,
      password: 'password123',
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await api.post('/auth/login').send({
      email: customerEmail,
      password: 'password123',
    });
    expect(loginResponse.status).toBe(200);
    const customerToken = loginResponse.body.accessToken as string;
    const customerAuth = { Authorization: `Bearer ${customerToken}` };

    const orderPayload = {
      items: [
        {
          productId: 'prod-cf-sua',
          size: ProductSize.M,
          quantity: 2,
          toppingIds: ['top-pearl'],
        },
      ],
      promotionCode: 'WELCOME10',
    };

    const unauthenticatedOrder = await api.post('/orders').send(orderPayload);
    expect(unauthenticatedOrder.status).toBe(401);

    const stockBeforeOrder = dbIngredients.get('ing-coffee').stockQuantity;
    const createdResponse = await api
      .post('/orders')
      .set(customerAuth)
      .send(orderPayload);
    expect(createdResponse.status).toBe(201);
    expect(createdResponse.body).toMatchObject({
      status: OrderStatus.PENDING,
      subtotal: 90000,
      discountAmount: 10000,
      total: 80000,
    });
    expect(createdResponse.body.orderItems[0]).toMatchObject({
      size: ProductSize.M,
      quantity: 2,
      lineTotal: 90000,
      toppings: [{ id: 'top-pearl', name: 'Trân châu đường đen' }],
    });
    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(
      stockBeforeOrder - 40,
    );

    const orderId = createdResponse.body.id as string;
    const persistedOrderResponse = await api
      .get(`/orders/${orderId}`)
      .set(customerAuth);
    expect(persistedOrderResponse.status).toBe(200);
    expect(persistedOrderResponse.body).toMatchObject({
      id: orderId,
      status: OrderStatus.PENDING,
      total: 80000,
    });

    const otherCustomerEmail = `other-${Date.now()}@brewlite.vn`;
    await api.post('/auth/register').send({
      email: otherCustomerEmail,
      password: 'password123',
    });
    const otherLoginResponse = await api.post('/auth/login').send({
      email: otherCustomerEmail,
      password: 'password123',
    });
    const otherCustomerAuth = {
      Authorization: `Bearer ${otherLoginResponse.body.accessToken as string}`,
    };
    const forbiddenPayment = await api
      .post('/payments')
      .set(otherCustomerAuth)
      .set('Idempotency-Key', `other-${orderId}`)
      .send({ orderId, method: PaymentMethod.WALLET });
    expect(forbiddenPayment.status).toBe(403);

    const missingIdempotencyKey = await api
      .post('/payments')
      .set(customerAuth)
      .send({ orderId, method: PaymentMethod.WALLET });
    expect(missingIdempotencyKey.status).toBe(400);

    const idempotencyKey = `api-payment-${orderId}`;
    const paymentRequest = () =>
      api
        .post('/payments')
        .set(customerAuth)
        .set('Idempotency-Key', idempotencyKey)
        .send({ orderId, method: PaymentMethod.WALLET });
    const paymentResponse = await paymentRequest();
    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body).toMatchObject({
      orderId,
      amount: 80000,
      status: 'PENDING',
      orderStatus: OrderStatus.PENDING,
      idempotentReplayed: false,
    });
    expect(paymentResponse.body.qrCodeUrl).toContain('img.vietqr.io/image/');

    const replayResponse = await paymentRequest();
    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.id).toBe(paymentResponse.body.id);
    expect(replayResponse.body.idempotentReplayed).toBe(true);

    const pendingStatusResponse = await api
      .get(`/payments/order/${orderId}/status`)
      .set(customerAuth);
    expect(pendingStatusResponse.status).toBe(200);
    expect(pendingStatusResponse.body).toMatchObject({
      orderId,
      status: 'PENDING',
      orderStatus: OrderStatus.PENDING,
    });

    const webhookResponse = await api
      .post('/payments/sepay-webhook/simulate')
      .send({ orderId, scenario: 'SUCCESS' });
    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      success: true,
      status: PaymentStatus.SUCCEEDED,
      orderStatus: OrderStatus.PAID,
      loyaltyPointsEarned: 8,
    });

    const duplicateWebhookResponse = await api
      .post('/payments/sepay-webhook/simulate')
      .send({ orderId, scenario: 'SUCCESS' });
    expect(duplicateWebhookResponse.status).toBe(200);
    expect(duplicateWebhookResponse.body.idempotentReplayed).toBe(true);
    expect(dbUsers.get(customerEmail)?.loyaltyPoints).toBe(8);
    expect(dbLoyaltyTxs.filter((tx) => tx.userId === dbUsers.get(customerEmail).id))
      .toHaveLength(1);

    const paidStatusResponse = await api
      .get(`/payments/order/${orderId}/status`)
      .set(customerAuth);
    expect(paidStatusResponse.status).toBe(200);
    expect(paidStatusResponse.body).toMatchObject({
      orderId,
      status: PaymentStatus.SUCCEEDED,
      orderStatus: OrderStatus.PAID,
    });

    const forbiddenOrderRead = await api
      .get(`/orders/${orderId}`)
      .set(otherCustomerAuth);
    expect(forbiddenOrderRead.status).toBe(404);

    const failedOrderResponse = await api
      .post('/orders')
      .set(customerAuth)
      .send({
        items: [
          {
            productId: 'prod-cf-sua',
            size: ProductSize.S,
            quantity: 1,
          },
        ],
      });
    expect(failedOrderResponse.status).toBe(201);
    const failedOrderId = failedOrderResponse.body.id as string;
    const stockBeforeFailedPayment =
      dbIngredients.get('ing-coffee').stockQuantity;
    expect(stockBeforeFailedPayment).toBe(stockBeforeOrder - 60);

    const failedPaymentResponse = await api
      .post('/payments')
      .set(customerAuth)
      .set('Idempotency-Key', `api-failure-${failedOrderId}`)
      .send({
        orderId: failedOrderId,
        method: PaymentMethod.CARD,
        simulateScenario: 'MOCK_FAIL',
      });
    expect(failedPaymentResponse.status).toBe(400);
    expect(dbIngredients.get('ing-coffee').stockQuantity).toBe(
      stockBeforeFailedPayment + 20,
    );

    const failedOrderRead = await api
      .get(`/orders/${failedOrderId}`)
      .set(customerAuth);
    expect(failedOrderRead.status).toBe(200);
    expect(failedOrderRead.body.status).toBe(OrderStatus.PAYMENT_FAILED);
  });
});
