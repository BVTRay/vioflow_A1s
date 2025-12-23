import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // 记录错误详情
    console.error('❌ 异常捕获:', {
      status,
      message,
      path: request.url,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // 提取错误消息
    let errorMessage: string;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (message && typeof message === 'object') {
      errorMessage = (message as any).message || (message as any).error || JSON.stringify(message);
    } else {
      errorMessage = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
      ...(typeof message === 'object' && message !== null && !(message instanceof Error) 
        ? { error: message } 
        : {}),
    });
  }
}






