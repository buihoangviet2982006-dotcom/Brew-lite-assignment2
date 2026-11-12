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

    it('should correctly determine isAvailable = false when limiting ingredient stock is 0', async () => {
      const outOfStockProduct = [
        {
          id: 'prod-out',
          name: 'Cà phê Đen',
          price: 25000 as any,
          imageUrl: '',
          isAvailable: true,
          recipeItems: [
            {
              id: 'rec-out',
              productId: 'prod-out',
              ingredientId: 'ing-1',
              quantityRequired: 20 as any,
              ingredient: {
                id: 'ing-1',
                name: 'Cà phê hạt',
                unit: 'GRAM',
                stockQuantity: 0 as any,
              },
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.product.findMany.mockResolvedValueOnce(outOfStockProduct);

      const result = await service.findAll();
      expect(result[0].isAvailable).toBe(false);
      expect(result[0].maxAvailableQuantity).toBe(0);
    });

    it('should calculate maxAvailableQuantity based on the limiting ingredient', async () => {
      const multiIngredientProduct = [
        {
          id: 'prod-milk-coffee',
          name: 'Cà phê Sữa',
          price: 30000 as any,
          imageUrl: '',
          isAvailable: true,
          recipeItems: [
            {
              id: 'rec-1',
              productId: 'prod-milk-coffee',
              ingredientId: 'ing-1',
              quantityRequired: 20 as any,
              ingredient: {
                id: 'ing-1',
                name: 'Cà phê',
                unit: 'GRAM',
                stockQuantity: 1000 as any, // 1000 / 20 = 50 cups
              },
            },
            {
              id: 'rec-2',
              productId: 'prod-milk-coffee',
              ingredientId: 'ing-2',
              quantityRequired: 30 as any,
              ingredient: {
                id: 'ing-2',
                name: 'Sữa đặc',
                unit: 'ML',
                stockQuantity: 300 as any, // 300 / 30 = 10 cups (limiting!)
              },
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.product.findMany.mockResolvedValueOnce(multiIngredientProduct);

      const result = await service.findAll();
      expect(result[0].maxAvailableQuantity).toBe(10);
      expect(result[0].isAvailable).toBe(true);
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
      expect(result.recipeItems).toHaveLength(1);
      expect(result.recipeItems[0].ingredient?.name).toBe('Hạt cà phê Robusta');
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
