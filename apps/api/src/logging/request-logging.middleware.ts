import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
// Only accept short, plain ids from clients so a header can't inject odd text into the logs.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

function resolveRequestId(header: string | string[] | undefined): string {
  return typeof header === 'string' && VALID_REQUEST_ID.test(header) ? header : randomUUID();
}

/**
 * Logs one line per request when the response finishes. It never logs bodies, query strings
 * or headers other than the request id, so secrets and personal data stay out of the logs.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.on('finish', () => {
      const entry = {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        requestId,
      };
      if (entry.statusCode >= 500) this.logger.error(entry);
      else if (entry.statusCode >= 400) this.logger.warn(entry);
      else this.logger.log(entry);
    });

    next();
  }
}
