import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Chỗ để Hoàng Gia Bảo thêm hàm findAll() cho API GET /products

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        recipeItems: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    const recipeItems = product.recipeItems ?? [];
    const canCalculateStock =
      recipeItems.length > 0 &&
      recipeItems.every(
        (item) => Boolean(item.ingredient) && Number(item.quantityRequired) > 0,
      );

    const maxAvailableQuantity = canCalculateStock
      ? Math.min(
          ...recipeItems.map((item) =>
            Math.floor(
              Number(item.ingredient.stockQuantity) /
                Number(item.quantityRequired),
            ),
          ),
        )
      : undefined;

    const isAvailable =
      maxAvailableQuantity !== undefined
        ? product.isAvailable && maxAvailableQuantity > 0
        : product.isAvailable;

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      isAvailable,
      ...(maxAvailableQuantity !== undefined && { maxAvailableQuantity }),
      recipeItems: recipeItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        ingredientId: item.ingredientId,
        quantityRequired: Number(item.quantityRequired),
        ...(item.ingredient && {
          ingredient: {
            id: item.ingredient.id,
            name: item.ingredient.name,
            unit: item.ingredient.unit,
          },
        }),
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}