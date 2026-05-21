import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Attaches a unique request ID to every incoming HTTP request.
 *
 * If the caller already sent an `X-Request-Id` header (e.g. from a gateway or
 * a frontend that echoes back a previous ID for retries), that value is reused.
 * Otherwise a fresh UUID v4 is generated.
 *
 * The ID is:
 *   1. Stored on `req.requestId` so middleware, guards, and filters can read it.
 *   2. Echoed back in the `X-Request-Id` response header so the client can
 *      include it in bug reports and support tickets.
 *
 * Registration order matters — this middleware must be applied BEFORE
 * HttpLoggerMiddleware so the logger can include the ID in each log line.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const incomingId = req.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
