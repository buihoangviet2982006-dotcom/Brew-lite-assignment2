import { PrismaClient, IngredientUnit } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Bắt đầu khởi tạo dữ liệu mẫu (Database Seed) ---');

  // 1. Dọn dẹp dữ liệu cũ (theo thứ tự quan hệ để tránh lỗi foreign key)
  await prisma.recipeItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.ingredient.deleteMany({});

  // 2. Tạo nguyên liệu (Ingredients)
  const arabica = await prisma.ingredient.create({
    data: {
      name: 'Cà phê hạt Arabica',
      unit: IngredientUnit.GRAM,
      stockQuantity: 10000,
      minThreshold: 1000,
      version: 1,
    },
  });

  const robusta = await prisma.ingredient.create({
    data: {
      name: 'Cà phê hạt Robusta',
      unit: IngredientUnit.GRAM,
      stockQuantity: 12000,
      minThreshold: 1500,
      version: 1,
    },
  });

  const freshMilk = await prisma.ingredient.create({
    data: {
      name: 'Sữa tươi thanh trùng',
      unit: IngredientUnit.ML,
      stockQuantity: 20000,
      minThreshold: 2000,
      version: 1,
    },
  });

  const condensedMilk = await prisma.ingredient.create({
    data: {
      name: 'Sữa đặc có đường',
      unit: IngredientUnit.ML,
      stockQuantity: 15000,
      minThreshold: 1500,
      version: 1,
    },
  });

  const matchaPowder = await prisma.ingredient.create({
    data: {
      name: 'Bột Matcha Uji',
      unit: IngredientUnit.GRAM,
      stockQuantity: 3000,
      minThreshold: 300,
      version: 1,
    },
  });

  const sugarSyrup = await prisma.ingredient.create({
    data: {
      name: 'Nước đường pha chế',
      unit: IngredientUnit.ML,
      stockQuantity: 10000,
      minThreshold: 1000,
      version: 1,
    },
  });

  console.log('✓ Đã tạo 6 nguyên liệu mẫu');

  // 3. Tạo sản phẩm (Products) kèm công thức định lượng (RecipeItems)
  // 3.1 Espresso
  await prisma.product.create({
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

  // 3.2 Cà phê sữa đá truyền thống
  await prisma.product.create({
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

  // 3.3 Cà phê Latte
  await prisma.product.create({
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

  // 3.4 Cappuccino
  await prisma.product.create({
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

  // 3.5 Matcha Latte
  await prisma.product.create({
    data: {
      name: 'Kyoto Matcha Latte',
      price: 55000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a',
      isAvailable: true,
      recipeItems: {
        create: [
          {
            ingredientId: matchaPowder.id,
            quantityRequired: 8, // 8g bột matcha
          },
          {
            ingredientId: freshMilk.id,
            quantityRequired: 150, // 150ml sữa tươi
          },
          {
            ingredientId: sugarSyrup.id,
            quantityRequired: 15, // 15ml nước đường
          },
        ],
      },
    },
  });

  console.log('✓ Đã tạo 5 sản phẩm mẫu kèm công thức định lượng (RecipeItems)');
  console.log('--- Hoàn tất Database Seed thành công! ---');
}

main()
  .catch((e) => {
    console.error('Lỗi khởi tạo dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

