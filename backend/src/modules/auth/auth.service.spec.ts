import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_ISSUER: 'vioflow',
        JWT_AUDIENCE: 'vioflow-users',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('应该返回用户当密码正确时', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: hashedPassword,
        role: 'member',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.password_hash).toBeUndefined();
    });

    it('应该返回null当用户不存在时', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('应该返回null当密码错误时', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: hashedPassword,
        role: 'member',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('应该返回access_token和用户信息当登录成功时', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: hashedPassword,
        role: 'member',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const loginDto = { username: 'test@example.com', password: 'password123' };
      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          sub: '1',
          role: 'member',
          iss: 'vioflow',
          aud: 'vioflow-users',
        }),
      );
    });
  });
});



















