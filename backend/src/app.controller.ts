import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Controller()
export class AppController {
  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get('health')
  async health() {
    const health: {
      status: string;
      timestamp: string;
      environment: string;
      services: {
        database: string;
      };
      error?: {
        database: string;
      };
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', 'development'),
      services: {
        database: 'unknown',
      },
    };

    // 检查数据库连接
    try {
      await this.dataSource.query('SELECT 1');
      health.services.database = 'connected';
    } catch (error: any) {
      health.services.database = 'disconnected';
      health.status = 'degraded';
      health.error = {
        database: error.message,
      };
    }

    return health;
  }

  @Get('api/health')
  async apiHealth() {
    return this.health();
  }
}

