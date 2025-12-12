import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isDevMode = request.headers['x-dev-mode'] === 'true';
    
    // 如果是开发者模式，检查是否有token
    if (isDevMode) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // 有token，正常验证
        return super.canActivate(context);
      } else {
        // 开发者模式下没有token，创建一个临时的用户对象
        request.user = {
          id: 'dev-mode-user',
          email: 'dev@admin.com',
          name: 'Developer Admin',
          role: 'DEV_SUPER_ADMIN',
          is_active: true,
        };
        return true;
      }
    }
    
    // 非开发者模式，正常验证
    return super.canActivate(context);
  }
}

