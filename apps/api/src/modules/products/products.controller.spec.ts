import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductList = [
    {
      id: 'prod-1',
      name: 'Cà phê Sữa Đá',
      price: 29000,
      imageUrl: 'https://example.com/cf-sua.jpg',
      isAvailable: true,
      maxAvailableQuantity: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-2',
      name: 'Bạc Xỉu',
      price: 32000,
      imageUrl: 'https://example.com/bac-xiu.jpg',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue(mockProductList),
    findOne: jest.fn().mockResolvedValue(mockProductList[0]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /products', () => {
    it('should return list of products (FR-01)', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockProductList);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product details by id (FR-02)', async () => {
      const result = await controller.findOne('prod-1');

      expect(service.findOne).toHaveBeenCalledWith('prod-1');
      expect(result).toEqual(mockProductList[0]);
    });
  });
});
