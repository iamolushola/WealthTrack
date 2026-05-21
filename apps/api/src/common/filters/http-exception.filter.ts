import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Standard error envelope returned by every failing API response.
 *
 * Frontend consumers should key on `success: false` and display `message`
 * to users. `requestId` can be sent to support for server-side log lookup.
 */
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  /** Short machine-readable category, e.g. "Bad Request", "Not Found". */
  error: string;
  /** Human-readable description. May be an array for validation errors. */
  message: string | string[];
  /** Echo of the X-Request-Id header — use this to find the server log. */
  requestId: string | undefined;
  timestamp: string;
}

/**
 * Catches every unhandled exception in the NestJS application and converts it
 * into a consistent ApiErrorBody JSON response.
 *
 * Rules:
 *  - HttpException  → use its status + response message verbatim.
 *  - Validation     → ValidationPipe produces a 400 HttpException; handled above.
 *  - Anything else  → log full stack internally, return a generic 500 to the client
 *                     so no implementation detail leaks to the browser.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'An unexpected error occurred. Please try again later.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const typed = body as Record<string, unknown>;
        message = (typed.message as string | string[] | undefined) ?? exception.message;
        if (typeof typed.error === 'string') {
          error = typed.error;
        }
      }

      // Derive a clean error label from the exception name when not overridden.
      if (error === 'Internal Server Error') {
        error = exception.name
          .replace('Exception', '')
          .replace(/([A-Z])/g, ' $1')
          .trim();
      }
    } else {
      // Unknown / programmer error — never expose internals to the client.
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Unhandled exception [${req.requestId ?? 'no-id'}] ${req.method} ${req.url}: ${err.message}`,
        err.stack,
      );
    }

    const body: ApiErrorBody = {
      success: false,
      statusCode,
      error,
      message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(body);
  }
}
