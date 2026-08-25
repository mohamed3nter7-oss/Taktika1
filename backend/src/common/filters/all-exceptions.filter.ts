import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { ErrorCode } from '../errors/error-codes';
import { ensureCorrelationId } from '../interceptors/correlation-id.interceptor';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
    correlationId: string;
  };
}

/** Widened to `number` so comparing against a plain status code is type-safe. */
const SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR;

/** Fallback when an exception carries no explicit code of its own. */
const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

/**
 * The single global filter producing CLAUDE.md §8's error envelope.
 *
 * Prisma error codes never reach clients — they are translated here and
 * nowhere else, so services can let constraint violations propagate instead of
 * writing check-then-insert races (§5).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const correlationId = ensureCorrelationId(req, res);

    const { status, code, message, details } = this.translate(exception);

    // §9: correlation id + userId is enough. Never the body, headers or cookies.
    const userId = req.user?.sub ?? 'anon';
    const context = `${req.method} ${req.originalUrl} → ${status} ${code} [user=${userId}] [cid=${correlationId}]`;

    if (status >= SERVER_ERROR) {
      this.logger.error(
        context,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(context);
    }

    const envelope: ErrorEnvelope = {
      success: false,
      error: { code, message, details, correlationId },
    };
    res.status(status).json(envelope);
  }

  private translate(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown[];
  } {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    // Anything unmapped is a bug. Return nothing about it — the stack is
    // already in the logs, keyed by the correlation id.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
      details: [],
    };
  }

  private fromHttpException(exception: HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    const fallbackCode = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR;

    if (typeof body === 'string') {
      return { status, code: fallbackCode, message: body, details: [] };
    }

    const payload = body as {
      code?: string;
      message?: string | string[];
      details?: unknown[];
    };

    // ValidationPipe reports every failed constraint in `message` as an array;
    // that array is the `details` list, not the human message.
    const isValidationList = Array.isArray(payload.message);

    return {
      status,
      code: payload.code ?? fallbackCode,
      message: isValidationList
        ? 'Request validation failed.'
        : ((payload.message as string | undefined) ?? exception.message),
      details: isValidationList
        ? (payload.message as string[])
        : (payload.details ?? []),
    };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': // unique constraint
        return {
          status: HttpStatus.CONFLICT,
          code: ErrorCode.CONFLICT,
          message: 'That record already exists.',
          details: [],
        };
      case 'P2025': // record not found
        return {
          status: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: 'Resource not found.',
          details: [],
        };
      case 'P2003': // foreign key violation — e.g. an unknown countryId/cityId
        return {
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'One or more referenced records do not exist.',
          details: [],
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
          details: [],
        };
    }
  }
}
