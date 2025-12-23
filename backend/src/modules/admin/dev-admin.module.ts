import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevAdminController } from './dev-admin.controller';
import { DevAdminService } from './dev-admin.service';
import { User } from '../users/entities/user.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeamMember]),
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
  controllers: [DevAdminController],
  providers: [DevAdminService],
  exports: [DevAdminService],
})
export class DevAdminModule {}


