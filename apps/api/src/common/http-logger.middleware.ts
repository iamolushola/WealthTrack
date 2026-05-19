import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'node:http';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const method = req.method ?? 'GET';
    const url = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? '/';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - start;
      const color =
        statusCode >= 500 ? '\x1b[31m' :  // red
        statusCode >= 400 ? '\x1b[33m' :  // yellow
        statusCode >= 300 ? '\x1b[36m' :  // cyan
        '\x1b[32m';                        // green
      const reset = '\x1b[0m';
      this.logger.log(`${color}${method} ${url} ${statusCode} ${ms}ms${reset}`);
    });

    next();
  }
}
