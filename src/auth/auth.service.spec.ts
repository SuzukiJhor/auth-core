import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    const usersServiceMock = {
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('fake_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = usersServiceMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a JWT token', () => {
    const user = { id: '1', email: 'test@email.com', role: 'user' };
    const result = service.login(user as User);
    expect(result).toHaveProperty('access_token');
  });

  it('should validate user with correct credentials', async () => {
    // Mock user and bcrypt
    const user = {
      id: '1',
      email: 'test@email.com',
      password: 'hashed',
      role: 'user',
    };
    (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

    const result = await service.validateUser('test@email.com', 'senha');
    expect(result).toEqual({ id: '1', email: 'test@email.com', role: 'user' });
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
    await expect(
      service.validateUser('wrong@email.com', 'senha'),
    ).rejects.toThrow('Invalid credentials');
  });
});
