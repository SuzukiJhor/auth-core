import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User as UserEntity } from 'src/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/common/decorators/user.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  // 1. Geração do segredo + QR Code
  @Post('2fa/generate')
  async generateTwoFactorSecret(@Body('email') email: string) {
    const { otpauthUrl, base32 } = this.authService.generateSecret(email);
    const qrCode = await this.authService.generateQrCode(String(otpauthUrl));
    return {
      qrCode,
      secret: base32,
    };
  }

  @Post('2fa/generate-terminal')
  generateTwoFactorTerminal(@Body('email') email: string) {
    const { otpauthUrl, base32 } = this.authService.generateSecret(email);
    void this.authService.generateQrCodeTerminal(String(otpauthUrl));
    return {
      message: 'QR code impresso no terminal',
      secret: base32,
    };
  }

  // 2. Habilitar o 2FA (usuário escaneou o QR e digitou o código TOTP)
  @Post('2fa/enable')
  enableTwoFactorAuth(@Body() body: { code: string; secret: string }) {
    const isValid = this.authService.isCodeValid(body.code, body.secret);
    if (!isValid) throw new UnauthorizedException('Código 2FA inválido');
    return { success: true };
  }

  // 3. Autenticação com 2FA (usuário já tem 2FA habilitado e precisa informar código)
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/authenticate')
  async authenticateTwoFactor(
    @User() user: UserEntity,
    @Body('code') code: string,
  ) {
    return this.authService.authenticateTwoFactor(user, code);
  }
}
