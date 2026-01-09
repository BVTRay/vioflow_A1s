/**
 * 日志工具
 * 在生产环境禁用详细日志，仅保留错误日志
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

class Logger {
  log(...args: unknown[]): void {
    if (isDev) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]): void {
    // 错误日志在生产环境也输出
    console.error(...args);
  }

  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...args);
    }
  }

  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...args);
    }
  }

  // 生产环境也输出的警告（重要警告）
  warnImportant(...args: unknown[]): void {
    console.warn(...args);
  }

  // 生产环境也输出的信息（重要信息）
  infoImportant(...args: unknown[]): void {
    console.info(...args);
  }
}

export const logger = new Logger();




















