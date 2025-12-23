import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevSuperAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // 仅在开发环境且明确启用时才允许dev mode
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const enableDevMode = this.configService.get('ENABLE_DEV_MODE', 'false') === 'true';
    const isDevModeAllowed = nodeEnv !== 'production' && enableDevMode;
    
    // 检查是否是开发者模式（通过请求头）
    const isDevMode = request.headers['x-dev-mode'] === 'true';
    
    if (isDevMode && isDevModeAllowed) {
      // 开发者模式下，允许访问（但需要已认证）
      if (!request.user) {
        throw new ForbiddenException('开发者模式需要认证');
      }
      return true;
    }

    // 非开发者模式或生产环境，检查角色
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未认证');
    }

    const role = typeof user.role === 'string' ? user.role : String(user.role);
    
    if (role !== 'DEV_SUPER_ADMIN') {
      throw new ForbiddenException('需要开发者超级管理员权限');
    }

    return true;
  }
}

