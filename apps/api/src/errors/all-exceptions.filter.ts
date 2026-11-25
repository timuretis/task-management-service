import { STATUS_CODES } from 'node:http';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Body-parser errors (e.g. 413 too large) carry a status but are not Nest HttpExceptions.
function isClientHttpError(e: unknown): e is { status: number; message: string } {
  const status = (e as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

function describe(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'object') {
      // Build the body field by field so a custom exception can't change the error shape.
      const { message, error } = response as Partial<ErrorBody>;
      return {
        statusCode,
        message: message ?? exception.message,
        error: error ?? STATUS_CODES[statusCode] ?? 'Error',
      };
    }
    return { statusCode, message: response, error: STATUS_CODES[statusCode] ?? 'Error' };
  }
  if (isClientHttpError(exception)) {
    const { status, message } = exception;
    return { statusCode: status, message, error: STATUS_CODES[status] ?? 'Error' };
  }
  // Anything else is a bug: never show its message, stack or SQL to the client.
  return { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' };
}

/**
 * One consistent error body `{ statusCode, message, error }` for every failure.
 * Client errors are already logged by the request-logging middleware; only 5xx log a stack here.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = describe(exception);
    if (body.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error('Unhandled exception', stack);
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
