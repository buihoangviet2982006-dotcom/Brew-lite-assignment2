import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, ProductSize } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrdersService (FR-05)', () => {
  let service: OrdersService;

const mockTx = {
  user: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  topping: {
    findMany: jest.fn(),
  },
  ingredient: {
    updateMany: jest.fn(),
  },
  promotion: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockPrismaService = {
  $transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) =>
    callback(mockTx),
  ),
  order: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('1. Tạo đơn hàng PENDING thành công và trừ tồn kho với Optimistic Locking', async () => {
    mockTx.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockTx.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Cà phê sữa đá BrewLite',
        price: 39000,
        imageUrl: '',
        isAvailable: true,
        recipeItems: [
          {
            ingredientId: 'ing-1',
            quantityRequired: 20,
            ingredient: {
              id: 'ing-1',
              name: 'Robusta',
              stockQuantity: 500,
              version: 1,
            },
          },
        ],
      },
    ]);
    mockTx.topping.findMany.mockResolvedValue([
      { id: 'top-1', name: 'Trân châu', price: 10000, isAvailable: true },
    ]);
    mockTx.ingredient.updateMany.mockResolvedValue({ count: 1 });
    mockTx.order.create.mockResolvedValue({
      id: 'order-123',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      subtotal: 110000,
      discountAmount: 0,
      total: 110000,
      promotionId: null,
      orderItems: [
        {
          id: 'oi-1',
          productId: 'prod-1',
          size: ProductSize.M,
          quantity: 2,
          lineTotal: 110000,
          product: {
            id: 'prod-1',
            name: 'Cà phê sữa đá BrewLite',
            price: 39000,
            imageUrl: '',
          },
          toppings: [{ id: 'top-1', name: 'Trân châu', price: 10000 }],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createOrder('user-1', {
      items: [
        {
          productId: 'prod-1',
          size: ProductSize.M,
          quantity: 2,
          toppingIds: ['top-1'],
        },
      ],
    });

    expect(mockTx.ingredient.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ing-1',
        version: 1,
        stockQuantity: { gte: 40 },
      },
      data: {
        stockQuantity: { decrement: 40 },
        version: { increment: 1 },
      },
    });
    expect(mockTx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 110000,
          total: 110000,
        }),
      }),
    );
    expect(result.orderId).toBe('order-123');
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(result.total).toBe(110000);
  });

  it('2. Ném lỗi 409 Conflict và Rollback khi nguyên liệu không đủ tồn kho', async () => {
    mockTx.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockTx.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Espresso',
        price: 35000,
        isAvailable: true,
        recipeItems: [
          {
            ingredientId: 'ing-1',
            quantityRequired: 18,
            ingredient: {
              id: 'ing-1',
              name: 'Robusta',
              stockQuantity: 10, // Chỉ còn 10g < 18g yêu cầu
              version: 1,
            },
          },
        ],
      },
    ]);

    await expect(
      service.createOrder('user-1', {
        items: [{ productId: 'prod-1', size: ProductSize.S, quantity: 1 }],
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockTx.order.create).not.toHaveBeenCalled();
  });

  it('3. Ném lỗi 409 Conflict khi xảy ra Race Condition (Optimistic Locking count = 0)', async () => {
    mockTx.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockTx.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Espresso',
        price: 35000,
        isAvailable: true,
        recipeItems: [
          {
            ingredientId: 'ing-1',
            quantityRequired: 18,
            ingredient: {
              id: 'ing-1',
              name: 'Robusta',
              stockQuantity: 100,
              version: 2,
            },
          },
        ],
      },
    ]);
    mockTx.ingredient.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.createOrder('user-1', {
        items: [{ productId: 'prod-1', size: ProductSize.M, quantity: 1 }],
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockTx.order.create).not.toHaveBeenCalled();
  });

  it('4. Ném lỗi 400 Bad Request khi chọn trùng topping trong cùng 1 món', async () => {
    await expect(
      service.createOrder('user-1', {
        items: [
          {
            productId: 'prod-1',
            size: ProductSize.M,
            quantity: 1,
            toppingIds: ['top-1', 'top-1'],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('5. Lấy danh sách đơn hàng của người dùng thành công', async () => {
    const mockOrders = [
      {
        id: 'order-123',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        subtotal: 98000,
        discountAmount: 0,
        total: 98000,
        promotionId: null,
        orderItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

    const result = await service.findOrdersByUser('user-1');

    expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
  }),
  );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-123');
  });

  it('6. Lấy chi tiết đơn hàng của người dùng thành công', async () => {
    const mockOrder = {
      id: 'order-123',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      subtotal: 98000,
      discountAmount: 0,
      total: 98000,
      promotionId: null,
      orderItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

    const result = await service.findOrderById('user-1', 'order-123');

    expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'order-123',
          userId: 'user-1',
        },
      }),
    );

    expect(result.id).toBe('order-123');
  });

  it('7. Báo lỗi 404 khi đơn hàng không tồn tại hoặc không thuộc người dùng', async () => {
    mockPrismaService.order.findFirst.mockResolvedValue(null);

    await expect(
      service.findOrderById('user-1', 'order-999'),
    ).rejects.toThrow(NotFoundException);
  });
});