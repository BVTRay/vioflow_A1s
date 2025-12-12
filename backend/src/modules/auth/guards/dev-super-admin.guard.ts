import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DevSuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // 检查是否是开发者模式（通过请求头）
    const isDevMode = request.headers['x-dev-mode'] === 'true';
    
    if (isDevMode) {
      // 开发者模式下，允许访问（但需要已认证）
      if (!request.user) {
        throw new ForbiddenException('开发者模式需要认证');
      }
      return true;
    }

    // 非开发者模式，检查角色
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

