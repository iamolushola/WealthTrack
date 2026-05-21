import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - start;

      // Status colour
      const statusColor =
        statusCode >= 500 ? '\x1b[31m' : // red
        statusCode >= 400 ? '\x1b[33m' : // yellow
        statusCode >= 300 ? '\x1b[36m' : // cyan
        '\x1b[32m';                       // green

      // Slow-request warning: dim grey < 500 ms, yellow 500-2000 ms, red > 2 s
      const msColor =
        ms > 2000 ? '\x1b[31m' :
        ms > 500  ? '\x1b[33m' :
        '\x1b[2m';

      const reset = '\x1b[0m';
      const dim   = '\x1b[2m';
      const reqId = req.requestId ? ` ${dim}[${req.requestId.slice(0, 8)}]${reset}` : '';

      this.logger.log(
        `${statusColor}${method} ${url} ${statusCode}${reset} ${msColor}${ms}ms${reset}${reqId}`,
      );
    });

    next();
  }
}
