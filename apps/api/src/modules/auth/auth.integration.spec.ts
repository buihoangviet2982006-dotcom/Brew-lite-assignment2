import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtService } from '@nestjs/jwt';

describe('AuthModule (Integration)', () => {
  let controller: AuthController;
  let jwtStrategy: JwtStrategy;
  let jwtService: JwtService;
  let validationPipe: ValidationPipe;

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
  };

  beforeAll(async () => {
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
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    controller = moduleFixture.get<AuthController>(AuthController);
    jwtStrategy = moduleFixture.get<JwtStrategy>(JwtStrategy);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });
  });

  describe('POST /auth/register (FR-04)', () => {
    it('should register a new account successfully and return AuthResponse with JWT', async () => {
      const dto = await validationPipe.transform(
        {
          email: '  NewCustomer@brewlite.vn ',
          password: 'securepassword123',
        },
        { type: 'body', metatype: RegisterDto },
      );

      const response = await controller.register(dto);

      expect(response).toHaveProperty('accessToken');
      expect(typeof response.accessToken).toBe('string');
      expect(response.user).toEqual({
        id: expect.any(String),
        email: 'newcustomer@brewlite.vn',
        loyaltyPoints: 0,
      });
    });

    it('should reject registration if email is already registered (409 Conflict)', async () => {
      const dto = await validationPipe.transform(
        {
          email: 'existing@brewlite.vn',
          password: 'newpassword123',
        },
        { type: 'body', metatype: RegisterDto },
      );

      await expect(controller.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should reject registration with invalid email format (400 Bad Request)', async () => {
      await expect(
        validationPipe.transform(
          {
            email: 'not-an-email',
            password: 'securepassword123',
          },
          { type: 'body', metatype: RegisterDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration with password shorter than 6 characters (400 Bad Request)', async () => {
      await expect(
        validationPipe.transform(
          {
            email: 'valid@brewlite.vn',
            password: '12345',
          },
          { type: 'body', metatype: RegisterDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /auth/login (FR-04)', () => {
    it('should authenticate user and return 200 OK with accessToken', async () => {
      const dto = await validationPipe.transform(
        {
          email: 'existing@brewlite.vn',
          password: 'secret123',
        },
        { type: 'body', metatype: LoginDto },
      );

      const response = await controller.login(dto);

      expect(response).toHaveProperty('accessToken');
      expect(typeof response.accessToken).toBe('string');
      expect(response.user.email).toBe('existing@brewlite.vn');
      expect(response.user.loyaltyPoints).toBe(100);
    });

    it('should return 401 Unauthorized when password is wrong', async () => {
      const dto = await validationPipe.transform(
        {
          email: 'existing@brewlite.vn',
          password: 'wrongpassword',
        },
        { type: 'body', metatype: LoginDto },
      );

      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return 401 Unauthorized when email does not exist', async () => {
      const dto = await validationPipe.transform(
        {
          email: 'unknown@brewlite.vn',
          password: 'secret123',
        },
        { type: 'body', metatype: LoginDto },
      );

      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('GET /auth/me & Protected Route (NFR-02)', () => {
    it('should reject access to protected endpoint without valid user in JwtAuthGuard (401 Unauthorized)', () => {
      const guard = new JwtAuthGuard();
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should grant access to protected endpoint with valid Bearer token (200 OK)', async () => {
      // Step 1: Login to get token
      const loginRes = await controller.login({
        email: 'existing@brewlite.vn',
        password: 'secret123',
      });

      const token = loginRes.accessToken;
      const decoded = jwtService.verify(token);

      // Step 2: Validate token payload through JwtStrategy and call getProfile
      const authenticatedUser = await jwtStrategy.validate(decoded);
      const profileRes = await controller.getProfile(authenticatedUser);

      expect(profileRes).toEqual({
        id: 'existing-user-uuid',
        email: 'existing@brewlite.vn',
        loyaltyPoints: 100,
      });
    });
  });
});
