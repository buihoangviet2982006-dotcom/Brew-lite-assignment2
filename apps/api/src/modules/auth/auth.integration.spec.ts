import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthModule (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockUsers = new Map<string, any>();

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) {
          const user = mockUsers.get(where.email.toLowerCase());
          return Promise.resolve(user || null);
        }
        if (where.id) {
          for (const u of mockUsers.values()) {
            if (u.id === where.id) return Promise.resolve(u);
          }
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = {
          id: 'user-' + Math.random().toString(36).substring(2, 9),
          email: data.email,
          passwordHash: data.passwordHash,
          loyaltyPoints: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(data.email.toLowerCase(), newUser);
        return Promise.resolve(newUser);
      }),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    order: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    // Seed pre-existing test user
    const existingPasswordHash = await bcrypt.hash('secret123', 10);
    mockUsers.set('existing@brewlite.vn', {
      id: 'existing-user-uuid',
      email: 'existing@brewlite.vn',
      passwordHash: existingPasswordHash,
      loyaltyPoints: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register (FR-04)', () => {
    it('should register a new account successfully and return 201 Created with JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newcustomer@brewlite.vn',
          password: 'securepassword123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: 'newcustomer@brewlite.vn',
        loyaltyPoints: 0,
      });
    });

    it('should reject registration if email is already registered (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@brewlite.vn',
          password: 'newpassword123',
        })
        .expect(409);
    });

    it('should reject registration with invalid email format (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'securepassword123',
        })
        .expect(400);
    });

    it('should reject registration with password shorter than 6 characters (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'valid@brewlite.vn',
          password: '12345',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login (FR-04)', () => {
    it('should authenticate user and return 200 OK with accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'existing@brewlite.vn',
          password: 'secret123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user.email).toBe('existing@brewlite.vn');
      expect(response.body.user.loyaltyPoints).toBe(100);
    });

    it('should return 401 Unauthorized when password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'existing@brewlite.vn',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 Unauthorized when email does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unknown@brewlite.vn',
          password: 'secret123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me & Protected Route (NFR-02)', () => {
    it('should reject access to protected endpoint without Bearer token (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should grant access to protected endpoint with valid Bearer token (200 OK)', async () => {
      // Step 1: Login to get token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'existing@brewlite.vn',
          password: 'secret123',
        })
        .expect(200);

      const token = loginRes.body.accessToken;

      // Step 2: Use token to call protected route
      const profileRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileRes.body).toEqual({
        id: 'existing-user-uuid',
        email: 'existing@brewlite.vn',
        loyaltyPoints: 100,
      });
    });
  });
});
