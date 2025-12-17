import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Annotation } from './entities/annotation.entity';
import { Video, VideoStatus } from '../videos/entities/video.entity';

@Injectable()
export class AnnotationsService {
  constructor(
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {}

  async findAll(videoId?: string): Promise<Annotation[]> {
    const query = this.annotationRepository
      .createQueryBuilder('annotation')
      .leftJoinAndSelect('annotation.user', 'user')
      .orderBy('annotation.created_at', 'ASC');
    
    if (videoId) {
      query.where('annotation.video_id = :videoId', { videoId });
    }
    
    return query.getMany();
  }

  async create(data: { videoId: string; userId: string; timecode: string; content: string; screenshotUrl?: string }): Promise<Annotation> {
    // 创建批注
    const annotation = this.annotationRepository.create({
      video_id: data.videoId,
      user_id: data.userId,
      timecode: data.timecode,
      content: data.content,
      screenshot_url: data.screenshotUrl,
    });
    const savedAnnotation = await this.annotationRepository.save(annotation);

    // 更新视频的批注计数和状态
    const video = await this.videoRepository.findOne({ where: { id: data.videoId } });
    if (video) {
      // 计算这是第几次批注（基于批注数量）
      const annotationCount = await this.annotationRepository.count({
        where: { video_id: data.videoId },
      });
      
      video.annotation_count = annotationCount;
      // 更新状态为 annotated（如果还不是的话）
      if (video.status !== VideoStatus.ANNOTATED && video.status !== VideoStatus.APPROVED) {
        video.status = VideoStatus.ANNOTATED;
      }
      await this.videoRepository.save(video);
    }

    return savedAnnotation;
  }

  async complete(id: string): Promise<Annotation> {
    const annotation = await this.annotationRepository.findOne({ where: { id } });
    if (annotation) {
      annotation.is_completed = true;
      annotation.completed_at = new Date();
      return this.annotationRepository.save(annotation);
    }
    return annotation;
  }

  async exportPdf(videoId: string): Promise<{ url: string; filename: string }> {
    // 获取视频信息
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['project'],
    });

    if (!video) {
      throw new Error('视频不存在');
    }

    // 获取批注列表
    const annotations = await this.findAll(videoId);

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `审阅报告_${video.name}_${timestamp}.pdf`;
    const filepath = path.join(exportDir, filename);

    // 创建 PDF 文档
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `审阅报告 - ${video.name}`,
        Author: 'Vioflow',
        Subject: '视频批注审阅报告',
      },
    });

    // 写入文件
    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    // 注册中文字体（使用系统字体）
    const fontPath = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc';
    const fallbackFontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    const systemFontPath = fs.existsSync(fontPath) ? fontPath : (fs.existsSync(fallbackFontPath) ? fallbackFontPath : null);

    // 标题页
    doc.fontSize(24).text('视频审阅报告', { align: 'center' });
    doc.moveDown(2);

    // 视频信息
    doc.fontSize(14).text(`视频名称: ${video.name}`, { align: 'left' });
    doc.fontSize(12).text(`项目: ${video.project?.name || '未知项目'}`, { align: 'left' });
    doc.text(`版本: v${video.version}`, { align: 'left' });
    doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, { align: 'left' });
    doc.text(`批注数量: ${annotations.length}`, { align: 'left' });
    doc.moveDown(2);

    // 分隔线
    doc.strokeColor('#cccccc').lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // 批注列表
    doc.fontSize(16).text('批注详情', { underline: true });
    doc.moveDown(1);

    if (annotations.length === 0) {
      doc.fontSize(12).fillColor('#888888').text('暂无批注', { align: 'center' });
    } else {
      annotations.forEach((annotation, index) => {
        // 检查是否需要新页
        if (doc.y > 700) {
          doc.addPage();
        }

        // 批注序号和时间码
        doc.fillColor('#333333').fontSize(12).text(`批注 #${index + 1}`, { continued: true });
        doc.fillColor('#6366f1').text(`  [${annotation.timecode}]`);

        // 批注者信息
        const authorName = annotation.user?.name || annotation.client_name || '访客';
        const isGuest = !annotation.user?.name;
        doc.fillColor('#666666').fontSize(10).text(
          `${authorName}${isGuest ? ' (访客)' : ''} · ${new Date(annotation.created_at).toLocaleString('zh-CN')}`
        );

        // 批注内容
        doc.fillColor('#000000').fontSize(11).text(annotation.content, {
          indent: 20,
          lineGap: 4,
        });

        // 截图占位（如果有截图URL）
        if (annotation.screenshot_url) {
          doc.fillColor('#888888').fontSize(9).text(`[截图: ${annotation.screenshot_url}]`, { indent: 20 });
        }

        // 状态标记
        if (annotation.is_completed) {
          doc.fillColor('#10b981').fontSize(9).text('✓ 已处理', { indent: 20 });
        }

        doc.moveDown(1.5);
      });
    }

    // 页脚
    doc.fontSize(8).fillColor('#999999');
    doc.text('由 Vioflow 视频管理系统生成', 50, 780, { align: 'center' });

    // 完成文档
    doc.end();

    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 返回下载URL
    const downloadUrl = `/api/annotations/download/${encodeURIComponent(filename)}`;

    return {
      url: downloadUrl,
      filename: filename,
    };
  }

  async getExportFile(filename: string): Promise<{ filepath: string; exists: boolean }> {
    const filepath = path.join(process.cwd(), 'uploads', 'exports', filename);
    return {
      filepath,
      exists: fs.existsSync(filepath),
    };
  }
}

