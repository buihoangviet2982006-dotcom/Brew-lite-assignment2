import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, ProductSize } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Đồng bộ với dữ liệu mẫu trong prisma/seed.ts
export const SIZE_EXTRA_PRICE: Record<ProductSize, number> = {
  [ProductSize.S]: 0,
  [ProductSize.M]: 0,
  [ProductSize.L]: 0,
};

interface IngredientUsage {
  id: string;
  name: string;
  stockQuantity: number;
  version: number;
  requiredQuantity: number;
  productIds: Set<string>;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng phải có ít nhất 1 sản phẩm');
    }

    for (const item of dto.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('Số lượng sản phẩm phải từ 1 trở lên');
      }
      if (
        item.toppingIds &&
        new Set(item.toppingIds).size !== item.toppingIds.length
      ) {
        throw new BadRequestException(
          'Không được chọn trùng topping trong cùng một món',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra người dùng tồn tại
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new UnauthorizedException('Tài khoản người dùng không tồn tại');
      }

      // 2. Truy vấn danh sách sản phẩm kèm công thức nguyên liệu và topping
      const uniqueProductIds = Array.from(
        new Set(dto.items.map((item) => item.productId)),
      );

      const products = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
        include: {
          recipeItems: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      if (products.length !== uniqueProductIds.length) {
        const foundProductIds = new Set(products.map((p) => p.id));
        const missingIds = uniqueProductIds.filter(
          (id) => !foundProductIds.has(id),
        );
        throw new BadRequestException(
          `Sản phẩm không tồn tại: ${missingIds.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      const uniqueToppingIds = Array.from(
        new Set(dto.items.flatMap((item) => item.toppingIds ?? [])),
      );

      const toppings =
        uniqueToppingIds.length > 0
          ? await tx.topping.findMany({
              where: { id: { in: uniqueToppingIds } },
            })
          : [];

      if (toppings.length !== uniqueToppingIds.length) {
        const foundToppingIds = new Set(toppings.map((t) => t.id));
        const missingToppingIds = uniqueToppingIds.filter(
          (id) => !foundToppingIds.has(id),
        );
        throw new BadRequestException(
          `Topping không tồn tại: ${missingToppingIds.join(', ')}`,
        );
      }

      const toppingMap = new Map(toppings.map((t) => [t.id, t]));

      // 3. Kiểm tra trạng thái mở bán & tổng hợp định lượng nguyên liệu cần trừ
      const outOfStockProductIds = new Set<string>();
      const ingredientUsageMap = new Map<string, IngredientUsage>();

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(
            `Không tìm thấy sản phẩm: ${item.productId}`,
          );
        }

        if (!product.isAvailable) {
          outOfStockProductIds.add(product.id);
        }

        for (const toppingId of item.toppingIds ?? []) {
          const topping = toppingMap.get(toppingId);
          if (!topping || !topping.isAvailable) {
            outOfStockProductIds.add(product.id);
          }
        }

        for (const recipe of product.recipeItems ?? []) {
          const requiredQty = Number(recipe.quantityRequired) * item.quantity;
          const existing = ingredientUsageMap.get(recipe.ingredientId);

          if (existing) {
            existing.requiredQuantity += requiredQty;
            existing.productIds.add(product.id);
          } else {
            ingredientUsageMap.set(recipe.ingredientId, {
              id: recipe.ingredient.id,
              name: recipe.ingredient.name,
              stockQuantity: Number(recipe.ingredient.stockQuantity),
              version: recipe.ingredient.version,
              requiredQuantity: requiredQty,
              productIds: new Set([product.id]),
            });
          }
        }
      }

      for (const usage of ingredientUsageMap.values()) {
        if (usage.stockQuantity < usage.requiredQuantity) {
          for (const productId of usage.productIds) {
            outOfStockProductIds.add(productId);
          }
        }
      }

      if (outOfStockProductIds.size > 0) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message:
            'Một số sản phẩm trong giỏ đã hết hàng hoặc không đủ số lượng. Vui lòng cập nhật lại giỏ hàng.',
          outOfStockProductIds: Array.from(outOfStockProductIds),
        });
      }

      // 4. Trừ tồn kho nguyên liệu với Optimistic Locking (kiểm tra version + stockQuantity >= requiredQuantity)
      for (const usage of ingredientUsageMap.values()) {
        if (usage.requiredQuantity <= 0) {
          continue;
        }

        const updated = await tx.ingredient.updateMany({
          where: {
            id: usage.id,
            version: usage.version,
            stockQuantity: {
              gte: usage.requiredQuantity,
            },
          },
          data: {
            stockQuantity: {
              decrement: usage.requiredQuantity,
            },
            version: {
              increment: 1,
            },
          },
        });

        if (updated.count === 0) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message:
              'Một số sản phẩm trong giỏ vừa hết hàng do có đơn đặt đồng thời. Vui lòng cập nhật lại giỏ hàng.',
            outOfStockProductIds: Array.from(usage.productIds),
          });
        }
      }

      // 5. Tính toán lại giá tiền chính xác tại tầng Backend
      const preparedItems = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const size = item.size ?? ProductSize.M;
        const sizeExtra = SIZE_EXTRA_PRICE[size] ?? 0;

        const selectedToppings = (item.toppingIds ?? []).map(
          (tid) => toppingMap.get(tid)!,
        );
        const toppingsPrice = selectedToppings.reduce(
          (sum, t) => sum + Number(t.price),
          0,
        );

        const unitPrice = Number(product.price) + sizeExtra + toppingsPrice;
        const lineTotal = unitPrice * item.quantity;

        return {
          productId: product.id,
          size,
          quantity: item.quantity,
          lineTotal,
          toppingIds: selectedToppings.map((t) => t.id),
        };
      });

      const subtotal = preparedItems.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );

      // 6. Kiểm tra và áp dụng mã khuyến mãi (nếu có)
      let discountAmount = 0;
      let promotionId: string | null = null;

      if (dto.promotionCode && dto.promotionCode.trim() !== '') {
        const code = dto.promotionCode.trim().toUpperCase();
        const now = new Date();

        const promotion = await tx.promotion.findUnique({
          where: { code },
        });

        if (
          !promotion ||
          !promotion.isActive ||
          now < promotion.validFrom ||
          now > promotion.validUntil
        ) {
          throw new BadRequestException(
            'Mã khuyến mãi không hợp lệ hoặc đã hết hạn',
          );
        }

        if (subtotal < Number(promotion.minOrderAmount)) {
          throw new BadRequestException(
            `Đơn hàng tối thiểu ${Number(promotion.minOrderAmount).toLocaleString('vi-VN')}đ để áp dụng mã ${code}`,
          );
        }

        if (
          promotion.usageLimit > 0 &&
          promotion.usedCount >= promotion.usageLimit
        ) {
          throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
        }

        const promoUpdated = await tx.promotion.updateMany({
          where: {
            id: promotion.id,
            isActive: true,
            ...(promotion.usageLimit > 0
              ? { usedCount: { lt: promotion.usageLimit } }
              : {}),
          },
          data: {
            usedCount: { increment: 1 },
          },
        });

        if (promoUpdated.count === 0) {
          throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
        }

        discountAmount = Math.min(subtotal, Number(promotion.discountValue));
        promotionId = promotion.id;
      }

      const total = Math.max(0, subtotal - discountAmount);

      // 7. Tạo bản ghi Order (trạng thái PENDING) và OrderItem trong cùng Transaction
      const createdOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          total,
          promotionId,
          orderItems: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
              ...(item.toppingIds.length > 0
                ? {
                    toppings: {
                      connect: item.toppingIds.map((id) => ({ id })),
                    },
                  }
                : {}),
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
              toppings: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      });

      return {
        id: createdOrder.id,
        orderId: createdOrder.id,
        userId: createdOrder.userId,
        status: createdOrder.status,
        subtotal: Number(createdOrder.subtotal),
        discountAmount: Number(createdOrder.discountAmount),
        total: Number(createdOrder.total),
        promotionId: createdOrder.promotionId,
        orderItems: createdOrder.orderItems.map((oi) => ({
          id: oi.id,
          productId: oi.productId,
          size: oi.size,
          quantity: oi.quantity,
          lineTotal: Number(oi.lineTotal),
          product: oi.product
            ? {
                id: oi.product.id,
                name: oi.product.name,
                price: Number(oi.product.price),
                imageUrl: oi.product.imageUrl,
              }
            : undefined,
          toppings: oi.toppings.map((t) => ({
            id: t.id,
            name: t.name,
            price: Number(t.price),
          })),
        })),
        createdAt: createdOrder.createdAt,
        updatedAt: createdOrder.updatedAt,
      };
    });
  }

  // 8. LẤY LỊCH SỬ ĐƠN HÀNG 
  async findOrdersByUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
            toppings: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderId: order.id,
      status: order.status,

      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),

      promotionId: order.promotionId,

      itemCount: order.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),

      orderItems: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),

        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              price: Number(item.product.price),
              imageUrl: item.product.imageUrl,
            }
          : undefined,

        toppings: item.toppings.map((topping) => ({
          id: topping.id,
          name: topping.name,
          price: Number(topping.price),
        })),
      })),

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }
  
  // 9. XEM CHI TIẾT ĐƠN HÀNG
  async findOrderById(
    userId: string,
    orderId: string,
  ) {
    if (!orderId || !orderId.trim()) {
      throw new BadRequestException(
        'Mã đơn hàng không hợp lệ',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
            toppings: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng',
      );
    }

    return {
      id: order.id,
      orderId: order.id,
      userId: order.userId,
      status: order.status,

      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),

      promotionId: order.promotionId,

      orderItems: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),

        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              price: Number(item.product.price),
              imageUrl: item.product.imageUrl,
            }
          : undefined,

        toppings: item.toppings.map((topping) => ({
          id: topping.id,
          name: topping.name,
          price: Number(topping.price),
        })),
      })),

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}