import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // CORS配置
  const corsOrigin = configService.get('CORS_ORIGIN');
  
  // 默认允许的域名（始终包含）
  const defaultOrigins: (string | RegExp)[] = [
    'http://localhost:3009',
    /^http:\/\/192\.168\.\d+\.\d+:3009$/, // 允许所有内网IP的3009端口
    /^http:\/\/127\.0\.0\.1:3009$/, // 允许127.0.0.1
    /^http:\/\/172\.\d+\.\d+\.\d+:3009$/, // 允许Docker网络IP
    'https://a1s.vioflow.cc',
    /^https:\/\/.*\.vercel\.app$/, // 允许所有 Vercel 预览域名
  ];
  
  // 从环境变量获取额外的允许域名
  const additionalOrigins = corsOrigin 
    ? corsOrigin.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  
  // 合并默认域名和环境变量中的域名（去重）
  const allowedOrigins = [...defaultOrigins, ...additionalOrigins];
  
  console.log('CORS 允许的域名:', allowedOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如移动应用或 Postman）
      if (!origin) {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Team-Id', 'X-Dev-Mode'],
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
  await app.listen(port, '0.0.0.0'); // 监听所有网络接口
  
  console.log(`✓ 后端服务已启动`);
  console.log(`✓ API地址: http://localhost:${port}`);
  console.log(`✓ 前端地址: ${configService.get('CORS_ORIGIN', 'http://localhost:3009')}`);
  console.log(`\n测试账号:`);
  console.log(`  管理员: admin@vioflow.com / admin`);
  console.log(`  成员: sarah@vioflow.com / admin`);
}

bootstrap();

