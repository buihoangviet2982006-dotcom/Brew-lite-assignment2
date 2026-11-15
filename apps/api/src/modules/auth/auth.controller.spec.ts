import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthResponse = {
    accessToken: 'mocked.jwt.token',
    user: {
      id: 'user-uuid-1234',
      email: 'customer@brewlite.vn',
      loyaltyPoints: 0,
    },
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockAuthResponse),
    login: jest.fn().mockResolvedValue(mockAuthResponse),
    getProfile: jest.fn().mockResolvedValue(mockAuthResponse.user),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    it('should call authService.register and return AuthResponse', async () => {
      const dto = {
        email: 'customer@brewlite.vn',
        password: 'password123',
      };

      const result = await controller.register(dto);
      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('POST /auth/login', () => {
    it('should call authService.login and return AuthResponse', async () => {
      const dto = {
        email: 'customer@brewlite.vn',
        password: 'password123',
      };

      const result = await controller.login(dto);
      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('GET /auth/me', () => {
    it('should return profile of currently authenticated user', async () => {
      const authUser = {
        id: 'user-uuid-1234',
        userId: 'user-uuid-1234',
        sub: 'user-uuid-1234',
        email: 'customer@brewlite.vn',
      };

      const result = await controller.getProfile(authUser);
      expect(service.getProfile).toHaveBeenCalledWith('user-uuid-1234');
      expect(result).toEqual(mockAuthResponse.user);
    });
  });
});
