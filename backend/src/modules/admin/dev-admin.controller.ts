import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DevAdminService } from './dev-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevSuperAdminGuard } from '../auth/guards/dev-super-admin.guard';

@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, DevSuperAdminGuard)
export class DevAdminController {
  constructor(private readonly devAdminService: DevAdminService) {}

  @Get()
  async getAllUsers() {
    try {
      return await this.devAdminService.getAllUsers();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: { email?: string; phone?: string; is_active?: boolean },
  ) {
    try {
      return await this.devAdminService.updateUser(id, data);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string) {
    try {
      await this.devAdminService.resetPassword(id);
      return { message: '密码已重置为 123456' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async softDeleteUser(@Param('id') id: string) {
    try {
      await this.devAdminService.softDeleteUser(id);
      return { message: '用户已软删除' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/impersonate')
  async impersonateUser(@Param('id') id: string) {
    try {
      return await this.devAdminService.impersonateUser(id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

