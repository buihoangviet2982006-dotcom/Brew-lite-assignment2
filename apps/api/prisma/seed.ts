import {
  PrismaClient,
  IngredientUnit,
  OrderStatus,
  ProductSize,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- [1/6] Bắt đầu dọn dẹp dữ liệu cũ (Database Cleanup) ---');

  // Dọn dẹp theo thứ tự an toàn ngược với ràng buộc khóa ngoại
  await prisma.loyaltyTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.topping.deleteMany({});
  await prisma.ingredient.deleteMany({});
  await prisma.promotion.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✓ Đã dọn dẹp sạch sẽ toàn bộ 10 bảng');

  console.log('--- [2/6] Tạo tài khoản người dùng mẫu (Users) ---');
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const manager = await prisma.user.create({
    data: {
      email: 'manager@brewlite.vn',
      passwordHash,
      loyaltyPoints: 100,
    },
  });

  const barista = await prisma.user.create({
    data: {
      email: 'barista@brewlite.vn',
      passwordHash,
      loyaltyPoints: 50,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@brewlite.vn',
      passwordHash,
      loyaltyPoints: 158, // 150 ban đầu + 8 điểm từ đơn hàng đã hoàn tất
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@brewlite.vn',
      passwordHash,
      loyaltyPoints: 0,
    },
  });

  console.log('✓ Đã tạo 4 tài khoản (manager, barista, customer, customer2)');

  console.log('--- [3/6] Tạo kho nguyên liệu (Ingredients) ---');
  const robusta = await prisma.ingredient.create({
    data: {
      name: 'Cà phê hạt Robusta Đắk Lắk',
      unit: IngredientUnit.GRAM,
      stockQuantity: 12000,
      minThreshold: 1500,
      version: 1,
    },
  });

  const arabica = await prisma.ingredient.create({
    data: {
      name: 'Cà phê hạt Arabica Cầu Đất',
      unit: IngredientUnit.GRAM,
      stockQuantity: 10000,
      minThreshold: 1000,
      version: 1,
    },
  });

  const freshMilk = await prisma.ingredient.create({
    data: {
      name: 'Sữa tươi thanh trùng Đà Lạt Milk',
      unit: IngredientUnit.ML,
      stockQuantity: 20000,
      minThreshold: 2000,
      version: 1,
    },
  });

  const condensedMilk = await prisma.ingredient.create({
    data: {
      name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
      unit: IngredientUnit.ML,
      stockQuantity: 15000,
      minThreshold: 1500,
      version: 1,
    },
  });

  const matchaPowder = await prisma.ingredient.create({
    data: {
      name: 'Bột Matcha Uji Nhật Bản',
      unit: IngredientUnit.GRAM,
      stockQuantity: 3000,
      minThreshold: 300,
      version: 1,
    },
  });

  const sugarSyrup = await prisma.ingredient.create({
    data: {
      name: 'Nước đường mía pha chế',
      unit: IngredientUnit.ML,
      stockQuantity: 10000,
      minThreshold: 1000,
      version: 1,
    },
  });

  console.log('✓ Đã tạo 6 nguyên liệu pha chế chất lượng cao');

  console.log('--- [4/6] Tạo sản phẩm, công thức (Products & Recipes) và Toppings ---');
  // 4.1 Tạo các món đồ uống
  const espresso = await prisma.product.create({
    data: {
      name: 'Espresso Intenso',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1510707577719-eaef77c59508',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: robusta.id,
            quantityRequired: 18, // 18g Robusta
          },
        ],
      },
    },
  });

  const coffeeSua = await prisma.product.create({
    data: {
      name: 'Cà phê sữa đá BrewLite',
      price: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: robusta.id,
            quantityRequired: 20, // 20g Robusta
          },
          {
            ingredientId: condensedMilk.id,
            quantityRequired: 30, // 30ml sữa đặc
          },
        ],
      },
    },
  });

  const latte = await prisma.product.create({
    data: {
      name: 'Caffe Latte',
      price: 49000,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: arabica.id,
            quantityRequired: 16, // 16g Arabica
          },
          {
            ingredientId: freshMilk.id,
            quantityRequired: 180, // 180ml sữa tươi
          },
        ],
      },
    },
  });

  const cappuccino = await prisma.product.create({
    data: {
      name: 'Cappuccino Classic',
      price: 49000,
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668ba67e53',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: arabica.id,
            quantityRequired: 16,
          },
          {
            ingredientId: freshMilk.id,
            quantityRequired: 120,
          },
        ],
      },
    },
  });

  const matchaLatte = await prisma.product.create({
    data: {
      name: 'Kyoto Matcha Latte',
      price: 55000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: matchaPowder.id,
            quantityRequired: 8,
          },
          {
            ingredientId: freshMilk.id,
            quantityRequired: 150,
          },
          {
            ingredientId: sugarSyrup.id,
            quantityRequired: 15,
          },
        ],
      },
    },
  });

  // 4.2 Tạo Toppings
  const toppingBoba = await prisma.topping.create({
    data: {
      name: 'Trân châu đường đen dẻo',
      price: 10000,
      imageUrl: 'https://images.unsplash.com/photo-1592318696245-562e831206f6',
      isAvailable: true,
    },
  });

  const toppingCheese = await prisma.topping.create({
    data: {
      name: 'Kem Cheese Macchiato béo mặn',
      price: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc',
      isAvailable: true,
    },
  });

  const toppingAloe = await prisma.topping.create({
    data: {
      name: 'Thạch nha đam giòn thanh',
      price: 10000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  const toppingCaramel = await prisma.topping.create({
    data: {
      name: 'Sốt Caramel thủ công',
      price: 8000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  console.log('✓ Đã tạo 5 sản phẩm đồ uống kèm công thức và 4 loại Topping');

  console.log('--- [5/6] Tạo mã khuyến mãi (Promotions) ---');
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const promoWelcome = await prisma.promotion.create({
    data: {
      code: 'WELCOME10',
      discountValue: 10000,
      minOrderAmount: 40000,
      validFrom: now,
      validUntil: nextYear,
      usageLimit: 1000,
      usedCount: 1,
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: 'BREWLITE20',
      discountValue: 20000,
      minOrderAmount: 80000,
      validFrom: now,
      validUntil: nextYear,
      usageLimit: 500,
      usedCount: 0,
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      code: 'FREESHIP',
      discountValue: 15000,
      minOrderAmount: 50000,
      validFrom: now,
      validUntil: nextYear,
      usageLimit: 200,
      usedCount: 0,
      isActive: true,
    },
  });

  console.log('✓ Đã tạo 3 mã khuyến mãi mẫu (WELCOME10, BREWLITE20, FREESHIP)');

  console.log('--- [6/6] Tạo đơn hàng mẫu, thanh toán và tích điểm (Orders, Payments, Loyalty) ---');

  // Đơn hàng #1: COMPLETED (Khách hàng customer@brewlite.vn)
  // Mua 1 Cà phê sữa đá Size M + Trân châu (39k + 10k = 49k)
  // và 1 Caffe Latte Size L (49k)
  // Tổng phụ = 98,000đ. Áp mã WELCOME10 (-10,000đ). Tổng trả = 88,000đ.
  const order1 = await prisma.order.create({
    data: {
      userId: customer.id,
      status: OrderStatus.COMPLETED,
      subtotal: 98000,
      discountAmount: 10000,
      total: 88000,
      promotionId: promoWelcome.id,
      orderItems: {
        create: [
          {
            productId: coffeeSua.id,
            size: ProductSize.M,
            quantity: 1,
            lineTotal: 49000,
            toppings: {
              connect: [{ id: toppingBoba.id }],
            },
          },
          {
            productId: latte.id,
            size: ProductSize.L,
            quantity: 1,
            lineTotal: 49000,
          },
        ],
      },
      payment: {
        create: {
          idempotencyKey: 'demo-tx-wallet-order-001',
          amount: 88000,
          method: PaymentMethod.WALLET,
          status: PaymentStatus.SUCCEEDED,
        },
      },
      loyaltyTransactions: {
        create: {
          userId: customer.id,
          points: 8,
          description: 'Tích lũy điểm thưởng từ đơn hàng BrewLite hoàn tất',
        },
      },
    },
  });

  // Đơn hàng #2: PREPARING (Đang pha chế - Khách hàng customer@brewlite.vn)
  // Mua 1 Kyoto Matcha Latte Size M + Kem Cheese (55k + 12k = 67k)
  // Tổng trả = 67,000đ thanh toán thẻ
  await prisma.order.create({
    data: {
      userId: customer.id,
      status: OrderStatus.PREPARING,
      subtotal: 67000,
      discountAmount: 0,
      total: 67000,
      orderItems: {
        create: [
          {
            productId: matchaLatte.id,
            size: ProductSize.M,
            quantity: 1,
            lineTotal: 67000,
            toppings: {
              connect: [{ id: toppingCheese.id }],
            },
          },
        ],
      },
      payment: {
        create: {
          idempotencyKey: 'demo-tx-card-order-002',
          amount: 67000,
          method: PaymentMethod.CARD,
          status: PaymentStatus.SUCCEEDED,
        },
      },
    },
  });

  // Đơn hàng #3: PENDING (Đơn mới tạo chưa thanh toán - Khách hàng customer2@brewlite.vn)
  // Mua 1 Espresso Intenso Size S (35,000đ)
  await prisma.order.create({
    data: {
      userId: customer2.id,
      status: OrderStatus.PENDING,
      subtotal: 35000,
      discountAmount: 0,
      total: 35000,
      orderItems: {
        create: [
          {
            productId: espresso.id,
            size: ProductSize.S,
            quantity: 1,
            lineTotal: 35000,
          },
        ],
      },
    },
  });

  console.log('✓ Đã tạo 3 đơn hàng mẫu ở các trạng thái COMPLETED, PREPARING, PENDING');
  console.log('✓ Đã liên kết chi tiết món (OrderItems), Size, Toppings, thanh toán (Payments) và tích điểm');
  console.log('');
  console.log('========================================================================');
  console.log(' 🎉 KHỞI TẠO DỮ LIỆU MẪU TOÀN DIỆN THÀNH CÔNG CHO TẤT CẢ 10 BẢNG! 🎉');
  console.log('========================================================================');
  console.log('Tài khoản kiểm thử:');
  console.log('  - Quản lý:  manager@brewlite.vn   | Mật khẩu: Password123!');
  console.log('  - Barista:  barista@brewlite.vn   | Mật khẩu: Password123!');
  console.log('  - Khách 1:  customer@brewlite.vn  | Mật khẩu: Password123! (158 điểm, 2 đơn)');
  console.log('  - Khách 2:  customer2@brewlite.vn | Mật khẩu: Password123! (0 điểm, 1 đơn chờ)');
  console.log('========================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khởi tạo dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
