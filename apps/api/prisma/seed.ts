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

  await prisma.user.create({
    data: {
      email: 'manager@brewlite.vn',
      passwordHash,
      loyaltyPoints: 100,
    },
  });

  await prisma.user.create({
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
      loyaltyPoints: 158,
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
  const ingredientSeeds = [
    {
      key: 'robusta',
      name: 'Cà phê hạt Robusta Đắk Lắk',
      unit: IngredientUnit.GRAM,
      stockQuantity: 15000,
      minThreshold: 1500,
    },
    {
      key: 'arabica',
      name: 'Cà phê hạt Arabica Cầu Đất',
      unit: IngredientUnit.GRAM,
      stockQuantity: 12000,
      minThreshold: 1000,
    },
    {
      key: 'freshMilk',
      name: 'Sữa tươi thanh trùng Đà Lạt Milk',
      unit: IngredientUnit.ML,
      stockQuantity: 30000,
      minThreshold: 2000,
    },
    {
      key: 'condensedMilk',
      name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
      unit: IngredientUnit.ML,
      stockQuantity: 18000,
      minThreshold: 1500,
    },
    {
      key: 'matchaPowder',
      name: 'Bột Matcha Uji Nhật Bản',
      unit: IngredientUnit.GRAM,
      stockQuantity: 4000,
      minThreshold: 300,
    },
    {
      key: 'sugarSyrup',
      name: 'Nước đường mía pha chế',
      unit: IngredientUnit.ML,
      stockQuantity: 15000,
      minThreshold: 1000,
    },
    {
      key: 'oolongTea',
      name: 'Lá trà Oolong Bảo Lộc rang đậm',
      unit: IngredientUnit.GRAM,
      stockQuantity: 6000,
      minThreshold: 500,
    },
    {
      key: 'blackTea',
      name: 'Trà đen Assam ủ lạnh',
      unit: IngredientUnit.GRAM,
      stockQuantity: 6000,
      minThreshold: 500,
    },
    {
      key: 'cocoaSauce',
      name: 'Sốt Chocolate Bỉ đậm đặc',
      unit: IngredientUnit.ML,
      stockQuantity: 5000,
      minThreshold: 500,
    },
    {
      key: 'peachSlice',
      name: 'Đào miếng ngâm giòn',
      unit: IngredientUnit.GRAM,
      stockQuantity: 5000,
      minThreshold: 500,
    },
    {
      key: 'taroPaste',
      name: 'Khoai môn nghiền thủ công',
      unit: IngredientUnit.GRAM,
      stockQuantity: 4000,
      minThreshold: 400,
    },
    {
      key: 'seasonalYuzu',
      name: 'Mứt Yuzu Nhật Bản (Hết hàng tạm thời)',
      unit: IngredientUnit.ML,
      stockQuantity: 0,
      minThreshold: 200,
    },
  ] as const;

  const ingredientsByKey: Record<string, { id: string }> = {};
  for (const item of ingredientSeeds) {
    ingredientsByKey[item.key] = await prisma.ingredient.create({
      data: {
        name: item.name,
        unit: item.unit,
        stockQuantity: item.stockQuantity,
        minThreshold: item.minThreshold,
        version: 1,
      },
    });
  }

  console.log(`✓ Đã tạo ${ingredientSeeds.length} nguyên liệu pha chế`);

  console.log('--- [4/6] Tạo sản phẩm, công thức (Products & Recipes) và Toppings ---');
  const productSeeds: Array<{
    key: string;
    name: string;
    price: number;
    imageUrl: string;
    isAvailable: boolean;
    recipes: Array<{ ingredientKey: string; quantityRequired: number }>;
  }> = [
      {
        key: 'espresso',
        name: 'Espresso Intenso',
        price: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        recipes: [{ ingredientKey: 'robusta', quantityRequired: 18 }],
      },
      {
        key: 'coffeeSua',
        name: 'Cà phê sữa đá BrewLite',
        price: 39000,
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'robusta', quantityRequired: 20 },
          { ingredientKey: 'condensedMilk', quantityRequired: 30 },
        ],
      },
      {
        key: 'blackCoffee',
        name: 'Cà phê đen đá Sài Gòn',
        price: 32000,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'robusta', quantityRequired: 22 },
          { ingredientKey: 'sugarSyrup', quantityRequired: 10 },
        ],
      },
      {
        key: 'bacXiu',
        name: 'Bạc xỉu kem sữa đá',
        price: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'robusta', quantityRequired: 12 },
          { ingredientKey: 'condensedMilk', quantityRequired: 35 },
          { ingredientKey: 'freshMilk', quantityRequired: 120 },
        ],
      },
      {
        key: 'americano',
        name: 'Americano Đá Lạnh',
        price: 39000,
        imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [{ ingredientKey: 'arabica', quantityRequired: 18 }],
      },
      {
        key: 'latte',
        name: 'Caffe Latte',
        price: 49000,
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'arabica', quantityRequired: 16 },
          { ingredientKey: 'freshMilk', quantityRequired: 180 },
        ],
      },
      {
        key: 'cappuccino',
        name: 'Cappuccino Classic',
        price: 49000,
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'arabica', quantityRequired: 16 },
          { ingredientKey: 'freshMilk', quantityRequired: 120 },
        ],
      },
      {
        key: 'caramelMacchiato',
        name: 'Caramel Macchiato',
        price: 55000,
        imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'arabica', quantityRequired: 16 },
          { ingredientKey: 'freshMilk', quantityRequired: 160 },
          { ingredientKey: 'sugarSyrup', quantityRequired: 20 },
        ],
      },
      {
        key: 'mocha',
        name: 'Mocha Chocolate Bỉ',
        price: 55000,
        imageUrl: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'arabica', quantityRequired: 16 },
          { ingredientKey: 'freshMilk', quantityRequired: 150 },
          { ingredientKey: 'cocoaSauce', quantityRequired: 25 },
        ],
      },
      {
        key: 'matchaLatte',
        name: 'Kyoto Matcha Latte',
        price: 55000,
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'matchaPowder', quantityRequired: 8 },
          { ingredientKey: 'freshMilk', quantityRequired: 150 },
          { ingredientKey: 'sugarSyrup', quantityRequired: 15 },
        ],
      },
      {
        key: 'oolongMilkTea',
        name: 'Trà sữa Oolong nướng',
        price: 49000,
        imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'oolongTea', quantityRequired: 12 },
          { ingredientKey: 'freshMilk', quantityRequired: 140 },
          { ingredientKey: 'sugarSyrup', quantityRequired: 20 },
        ],
      },
      {
        key: 'blackMilkTea',
        name: 'Hồng trà sữa Assam',
        price: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'blackTea', quantityRequired: 10 },
          { ingredientKey: 'condensedMilk', quantityRequired: 25 },
          { ingredientKey: 'freshMilk', quantityRequired: 120 },
        ],
      },
      {
        key: 'taroMilkTea',
        name: 'Trà sữa Khoai Môn Taro',
        price: 52000,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'blackTea', quantityRequired: 8 },
          { ingredientKey: 'freshMilk', quantityRequired: 150 },
          { ingredientKey: 'taroPaste', quantityRequired: 35 },
        ],
      },
      {
        key: 'peachTea',
        name: 'Trà đào cam sả',
        price: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        recipes: [
          { ingredientKey: 'blackTea', quantityRequired: 10 },
          { ingredientKey: 'peachSlice', quantityRequired: 40 },
          { ingredientKey: 'sugarSyrup', quantityRequired: 25 },
        ],
      },
      {
        key: 'yuzuColdBrew',
        name: 'Cold Brew Yuzu (Tạm hết hàng)',
        price: 59000,
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
        isAvailable: false,
        recipes: [
          { ingredientKey: 'arabica', quantityRequired: 20 },
          { ingredientKey: 'seasonalYuzu', quantityRequired: 30 },
        ],
      },
    ];

  const productsByKey: Record<string, { id: string }> = {};
  for (const item of productSeeds) {
    productsByKey[item.key] = await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        recipeItems: {
          create: item.recipes.map((recipe) => ({
            ingredientId: ingredientsByKey[recipe.ingredientKey].id,
            quantityRequired: recipe.quantityRequired,
          })),
        },
      },
    });
  }

  // 4.2 Tạo Toppings
  const toppingBoba = await prisma.topping.create({
    data: {
      name: 'Trân châu đường đen dẻo',
      price: 10000,
      imageUrl: 'https://images.unsplash.com/photo-1592318696245-562e831206f6?auto=format&fit=crop&w=400&q=80',
      isAvailable: true,
    },
  });

  const toppingCheese = await prisma.topping.create({
    data: {
      name: 'Kem Cheese Macchiato béo mặn',
      price: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=400&q=80',
      isAvailable: true,
    },
  });

  await prisma.topping.create({
    data: {
      name: 'Thạch nha đam giòn thanh',
      price: 10000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  await prisma.topping.create({
    data: {
      name: 'Sốt Caramel thủ công',
      price: 8000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  await prisma.topping.create({
    data: {
      name: 'Pudding trứng mềm mịn',
      price: 10000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  await prisma.topping.create({
    data: {
      name: 'Thạch cà phê Espresso',
      price: 9000,
      imageUrl: '',
      isAvailable: true,
    },
  });

  console.log(`✓ Đã tạo ${productSeeds.length} sản phẩm đồ uống kèm công thức và 6 loại Topping`);

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

  await prisma.promotion.create({
    data: {
      code: 'BREW50',
      discountValue: 25000,
      minOrderAmount: 120000,
      validFrom: now,
      validUntil: nextYear,
      usageLimit: 300,
      usedCount: 0,
      isActive: true,
    },
  });

  console.log('✓ Đã tạo 4 mã khuyến mãi mẫu (WELCOME10, BREWLITE20, FREESHIP, BREW50)');

  console.log('--- [6/6] Tạo đơn hàng mẫu, thanh toán và tích điểm (Orders, Payments, Loyalty) ---');

  await prisma.order.create({
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
            productId: productsByKey.coffeeSua.id,
            size: ProductSize.M,
            quantity: 1,
            lineTotal: 49000,
            toppings: {
              connect: [{ id: toppingBoba.id }],
            },
          },
          {
            productId: productsByKey.latte.id,
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
            productId: productsByKey.matchaLatte.id,
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
            productId: productsByKey.espresso.id,
            size: ProductSize.S,
            quantity: 1,
            lineTotal: 35000,
          },
        ],
      },
    },
  });

  console.log('✓ Đã tạo 3 đơn hàng mẫu ở các trạng thái COMPLETED, PREPARING, PENDING');
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
