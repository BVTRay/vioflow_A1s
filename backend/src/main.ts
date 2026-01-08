import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: true, // 启用 body parser
    });
    
    // 设置请求体大小限制（用于文件上传）
    app.use(require('express').json({ limit: '600mb' }));
    app.use(require('express').urlencoded({ limit: '600mb', extended: true }));
    
    const configService = app.get(ConfigService);
  
  // CORS配置
  const corsOrigin = configService.get('CORS_ORIGIN');
  
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  
  // 默认允许的域名（始终包含）
  const defaultOrigins: (string | RegExp)[] = [
    'https://a1s.vioflow.cc',
  ];
  
  // 仅在开发环境添加本地和内网地址
  if (!isProduction) {
    defaultOrigins.push(
      'http://localhost:3009',
      'http://192.168.110.112:3009', // 服务器 IP 地址
      /^http:\/\/192\.168\.110\.\d+:3009$/, // 仅允许特定内网IP段
      /^http:\/\/127\.0\.0\.1:3009$/, // 允许127.0.0.1
    );
  }
  
  // 从环境变量获取额外的允许域名
  const additionalOrigins = corsOrigin 
    ? corsOrigin.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  
  // 合并默认域名和环境变量中的域名（去重）
  const allowedOrigins = [...defaultOrigins, ...additionalOrigins];
  
  console.log('CORS 允许的域名:', allowedOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // 生产环境禁止无origin请求，开发环境允许（用于Postman等工具）
      if (!origin) {
        if (isProduction) {
          return callback(new Error('CORS: Origin header is required in production'));
        }
        return callback(null, true);
      }
      
      // 检查是否在允许列表中（支持字符串匹配和正则匹配）
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS 阻止的域名: ${origin}`);
        console.warn(`允许的域名列表:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: isProduction 
      ? ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Team-Id', 'X-Dev-Mode', 'x-dev-mode']
      : ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Team-Id', 'X-Dev-Mode', 'x-dev-mode'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局数据转换拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

    const port = configService.get('PORT', 3002);
    
    try {
      await app.listen(port, '0.0.0.0'); // 监听所有网络接口
      
      console.log(`✓ 后端服务已启动`);
      console.log(`✓ API地址: http://192.168.110.112:${port}`);
      console.log(`✓ 前端地址: ${configService.get('CORS_ORIGIN', 'http://192.168.110.112:3009')}`);
      console.log(`\n测试账号:`);
      console.log(`  管理员: admin@vioflow.com / admin`);
      console.log(`  成员: sarah@vioflow.com / admin`);
    } catch (listenError: any) {
      console.error(`❌ 启动失败: 无法监听端口 ${port}`, {
        message: listenError?.message,
        code: listenError?.code,
        errno: listenError?.errno,
        syscall: listenError?.syscall,
      });
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ 应用启动失败:`, {
      message: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error(`❌ Bootstrap 失败:`, error);
  process.exit(1);
});

