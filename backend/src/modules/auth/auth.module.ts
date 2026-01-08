import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { SmsService } from './services/sms.service';
import { WechatService } from './services/wechat.service';
import { QrCodeScanService } from './services/qrcode-scan.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
            issuer: configService.get('JWT_ISSUER', 'vioflow-api'),
            audience: configService.get('JWT_AUDIENCE', 'vioflow-client'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, SmsService, WechatService, QrCodeScanService],
  exports: [AuthService],
})
export class AuthModule {}

