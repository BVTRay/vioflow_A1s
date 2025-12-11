import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // CORS配置
  const corsOrigin = configService.get('CORS_ORIGIN');
  const allowedOrigins = corsOrigin 
    ? corsOrigin.split(',').map(o => o.trim()).filter(Boolean) // 支持多个域名，用逗号分隔
    : ['http://localhost:3009', 'https://a1s.vioflow.cc']; // 默认允许本地和 Vercel 域名
  
  console.log('CORS 允许的域名:', allowedOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如移动应用或 Postman）
      if (!origin) {
        return callback(null, true);
      }
      
      // 检查是否在允许列表中
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS 阻止的域名: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`✓ 后端服务已启动`);
  console.log(`✓ API地址: http://localhost:${port}`);
  console.log(`✓ 前端地址: ${configService.get('CORS_ORIGIN', 'http://localhost:3009')}`);
  console.log(`\n测试账号:`);
  console.log(`  管理员: admin@vioflow.com / admin`);
  console.log(`  成员: sarah@vioflow.com / admin`);
}

bootstrap();

