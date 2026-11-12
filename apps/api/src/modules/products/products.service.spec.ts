import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProductList = [
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
      findMany: jest.fn().mockResolvedValue(mockProductList),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of products with calculated availability and numeric price (FR-01)', async () => {
      const result = await service.findAll();

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('prod-1');
      expect(result[0].name).toBe('Cà phê Sữa Đá');
      expect(result[0].price).toBe(29000);
      expect(typeof result[0].price).toBe('number');
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].maxAvailableQuantity).toBe(50); // 1000 / 20 = 50
    });

    it('should return empty list when no products found', async () => {
      mockPrismaService.product.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return product details when found (FR-02)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce(mockProductList[0]);

      const result = await service.findOne('prod-1');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: expect.any(Object),
      });
      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Cà phê Sữa Đá');
      expect(result.price).toBe(29000);
      expect(result.maxAvailableQuantity).toBe(50);
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
