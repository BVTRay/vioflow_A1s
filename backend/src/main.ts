import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // CORS配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3009'),
    credentials: true,
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

