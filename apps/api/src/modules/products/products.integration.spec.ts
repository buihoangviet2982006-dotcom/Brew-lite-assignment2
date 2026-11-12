import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import request from 'supertest';
import { ProductsModule } from './products.module';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';

describe('Products API (HTTP integration)', () => {
  let app: INestApplication;

  const product = {
    id: 'product-1',
    name: 'Latte',
    price: 45000,
    imageUrl: 'https://example.com/latte.jpg',
    isAvailable: true,
    recipeItems: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const prismaMock = {
    product: {
      findMany: jest.fn<() => Promise<Array<typeof product>>>(),
      findUnique: jest.fn<() => Promise<typeof product | null>>(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ProductsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    prismaMock.product.findMany.mockResolvedValue([product]);
    prismaMock.product.findUnique.mockResolvedValue(product);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /products returns the product list over HTTP', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: 'product-1',
        name: 'Latte',
        price: 45000,
        isAvailable: true,
      }),
    ]);
    expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1);
  });

  it('GET /products/:id returns one product over HTTP', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/product-1')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'product-1',
        name: 'Latte',
        price: 45000,
        isAvailable: true,
      }),
    );
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'product-1' } }),
    );
  });

  it('GET /products/:id returns 404 when the product does not exist', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer()).get('/products/missing').expect(404);
  });
});
