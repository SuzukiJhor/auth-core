import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from 'src/users/entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcryptjs';
import * as qrcode from 'qrcode';

export type AuthenticatedUser = Omit<User, 'password'>;
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  login(user: AuthenticatedUser) {
    const payload = { username: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `Auth Plataform (${email})`,
    });

    return {
      otpauthUrl: secret.otpauth_url,
      base32: secret.base32,
    };
  }

  async generateQrCode(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }

  async generateQrCodeTerminal(otpauthUrl: string): Promise<string> {
    return await qrcode.toString(otpauthUrl, { type: 'terminal', small: true });
  }

  isCodeValid(code: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  async authenticateTwoFactor(
    user: User,
    code: string,
  ): Promise<{ access_token: string }> {
    const userInDb = await this.usersService.findById(user.id);

    if (!userInDb || !userInDb.twoFASecret)
      throw new UnauthorizedException(
        '2FA não está configurado para este usuário.',
      );

    const isCodeValid = speakeasy.totp.verify({
      secret: userInDb.twoFASecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isCodeValid) throw new UnauthorizedException('Código 2FA inválido.');

    await this.usersService.enableTwoFA(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      isTwoFactorAuthenticated: true,
    };

    const token = this.jwtService.sign(payload);

    return { access_token: token };
  }
}
