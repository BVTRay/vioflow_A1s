import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.sharesService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { 
    type: string; 
    videoId?: string; 
    projectId?: string;
    allowDownload?: boolean;
    hasPassword?: boolean;
    password?: string;
    expiresAt?: string;
    justification?: string;
  }, @Request() req) {
    return this.sharesService.createShareLink({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Get(':token')
  async findByToken(@Param('token') token: string) {
    const shareLink = await this.sharesService.findByToken(token);
    if (!shareLink) {
      return { error: '分享链接不存在或已失效' };
    }
    // 不返回密码哈希
    const { password_hash, ...result } = shareLink;
    return result;
  }

  @Post(':token/verify-password')
  async verifyPassword(
    @Param('token') token: string,
    @Body() body: { password: string },
  ) {
    const isValid = await this.sharesService.verifyPassword(token, body.password);
    if (!isValid) {
      return { error: '密码错误' };
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.sharesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.sharesService.toggle(id);
  }

  // 公开接口：通过分享token获取批注
  @Get(':token/annotations')
  async getAnnotations(@Param('token') token: string) {
    return this.sharesService.getAnnotationsByShareToken(token);
  }

  // 公开接口：通过分享token创建批注
  @Post(':token/annotations')
  async createAnnotation(
    @Param('token') token: string,
    @Body() body: { timecode: string; content: string; clientName?: string },
  ) {
    try {
      return await this.sharesService.createAnnotationByShareToken(token, body);
    } catch (error: any) {
      return { error: error.message || '创建批注失败' };
    }
  }
}

