import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;
  beforeEach(async () => {
    const authServiceMock = {
      validateUser: jest
        .fn()
        .mockResolvedValue({ id: '1', email: 'test@email.com', role: 'user' }),
      login: jest.fn().mockReturnValue({ access_token: 'fake_token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login and return access_token', async () => {
    const body = { email: 'test@email.com', password: 'senha' };
    const result = await controller.login(body);
    expect(result).toHaveProperty('access_token');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.validateUser).toHaveBeenCalledWith(
      body.email,
      body.password,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.login).toHaveBeenCalled();
  });

  it('should generate 2FA secret and QR code', async () => {
    service.generateSecret = jest.fn().mockReturnValue({
      otpauthUrl: 'otpauth://totp/label?secret=SECRET',
      base32: 'SECRET',
    });
    service.generateQrCode = jest
      .fn()
      .mockResolvedValue('data:image/png;base64,abc');

    const result = await controller.generateTwoFactorSecret('test@email.com');
    expect(result).toEqual({
      qrCode: 'data:image/png;base64,abc',
      secret: 'SECRET',
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.generateSecret).toHaveBeenCalledWith('test@email.com');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.generateQrCode).toHaveBeenCalledWith(
      'otpauth://totp/label?secret=SECRET',
    );
  });

  it('should throw if credentials are invalid', async () => {
    service.validateUser = jest
      .fn()
      .mockRejectedValue(new Error('Invalid credentials'));
    await expect(
      controller.login({ email: 'fail@email.com', password: 'wrong' }),
    ).rejects.toThrow('Invalid credentials');
  });
});
