import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../auth.service';
import { JwtPayloadDto } from '../dto/jwt-payload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      issuer: configService.get('JWT_ISSUER', 'vioflow-api'),
      audience: configService.get('JWT_AUDIENCE', 'vioflow-client'),
    });
  }

  async validate(payload: any) {
    // 使用 plainToInstance 和 validate 进行 DTO 验证
    const dto = plainToInstance(JwtPayloadDto, payload);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.authService.validateToken(dto);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

