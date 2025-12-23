import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../auth.service';
import { ValidateUserDto } from '../dto/validate-user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    // 使用 plainToInstance 和 validate 进行 DTO 验证
    const dto = plainToInstance(ValidateUserDto, { email, password });
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      throw new UnauthorizedException('Invalid credentials format');
    }

    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

