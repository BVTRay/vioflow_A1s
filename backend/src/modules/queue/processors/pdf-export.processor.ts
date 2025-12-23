import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { AnnotationsService } from '../../annotations/annotations.service';
import { PdfExportJobData, PdfExportJobResult } from '../interfaces/pdf-export-job.interface';

@Processor('pdf-export')
export class PdfExportProcessor {
  private readonly logger = new Logger(PdfExportProcessor.name);

  constructor(
    @Inject(forwardRef(() => AnnotationsService))
    private readonly annotationsService: AnnotationsService,
  ) {}

  @Process('export')
  async handlePdfExport(job: Job<PdfExportJobData>): Promise<PdfExportJobResult> {
    const { videoId, userId } = job.data;
    
    this.logger.log(`[PdfExportProcessor] 开始处理PDF导出任务: videoId=${videoId}, userId=${userId}`);

    try {
      const result = await this.annotationsService.exportPdf(videoId);
      this.logger.log(`[PdfExportProcessor] PDF导出成功: ${result.filename}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[PdfExportProcessor] PDF导出失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}

