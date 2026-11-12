import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Products API Controller & Service Integration (Task 4.3 MVP Sprint 1 - No DB)', () => {
  let controller: ProductsController;
  let prisma: PrismaService;

  const mockProductDb = [
    {
      id: 'prod-1',
      name: 'Cà phê Sữa Đá',
      price: 29000 as any,
      imageUrl: 'https://example.com/cf-sua.jpg',
      isAvailable: true,
      recipeItems: [
        {
          id: 'rec-1',
          productId: 'prod-1',
          ingredientId: 'ing-1',
          quantityRequired: 20 as any,
          ingredient: {
            id: 'ing-1',
            name: 'Hạt cà phê Robusta',
            unit: 'GRAM',
            stockQuantity: 1000 as any,
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-2',
      name: 'Bạc Xỉu',
      price: 32000 as any,
      imageUrl: 'https://example.com/bac-xiu.jpg',
      isAvailable: true,
      recipeItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockProductDb)),
      findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
        const found = mockProductDb.find((p) => p.id === id);
        return Promise.resolve(found || null);
      }),
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = moduleRef.get<ProductsController>(ProductsController);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /products (FR-01)', () => {
    it('should integrate Controller and Service to return transformed product list', async () => {
      const result = await controller.findAll();

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      const firstItem = result[0];
      expect(firstItem.id).toBe('prod-1');
      expect(firstItem.name).toBe('Cà phê Sữa Đá');
      expect(firstItem.price).toBe(29000);
      expect(typeof firstItem.price).toBe('number');
      expect(firstItem.isAvailable).toBe(true);
      expect(firstItem.maxAvailableQuantity).toBe(50); // 1000 / 20 = 50
    });

    it('should return empty list when database has no products', async () => {
      mockPrismaService.product.findMany.mockImplementationOnce(() =>
        Promise.resolve([])
      );

      const result = await controller.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('GET /products/:id (FR-02)', () => {
    it('should return product details including recipe items for a valid id', async () => {
      const result = await controller.findOne('prod-1');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: expect.any(Object),
      });

      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Cà phê Sữa Đá');
      expect(result.price).toBe(29000);
      expect(typeof result.price).toBe('number');
      expect(result.isAvailable).toBe(true);
      expect(result.recipeItems).toHaveLength(1);
      expect(result.recipeItems[0].ingredient?.name).toBe('Hạt cà phê Robusta');
    });

    it('should throw NotFoundException (HTTP 404) for a non-existing id', async () => {
      await expect(controller.findOne('non-existing-product')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

