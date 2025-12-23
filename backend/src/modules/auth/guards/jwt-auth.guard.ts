import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isDevMode = request.headers['x-dev-mode'] === 'true';
    
    // 仅在开发环境且明确启用时才允许dev mode
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const enableDevMode = this.configService.get('ENABLE_DEV_MODE', 'false') === 'true';
    const isDevModeAllowed = nodeEnv !== 'production' && enableDevMode;
    
    // 如果是开发者模式，检查是否有token
    if (isDevMode && isDevModeAllowed) {
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
    
    // 非开发者模式或生产环境，正常验证
    return super.canActivate(context);
  }
}

