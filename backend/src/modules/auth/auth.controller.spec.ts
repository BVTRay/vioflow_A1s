import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    validateToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('应该调用authService.login并返回结果', async () => {
      const loginDto = { username: 'test@example.com', password: 'password123' };
      const expectedResult = {
        access_token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'member',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('应该返回用户信息', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        avatar_url: null,
        team_id: 'team-1',
        phone: null,
        is_active: true,
      };

      const req = { user: { id: '1' } };
      mockAuthService.validateToken.mockResolvedValue(mockUser);

      const result = await controller.getProfile(req as any);

      expect(result).toEqual(mockUser);
      expect(authService.validateToken).toHaveBeenCalledWith({ sub: '1' });
    });
  });
});



















