import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/** Where the id is parked on the request so the exception filter can find it. */
const CORRELATION_ID_PROP = 'correlationId';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Idempotently attaches a correlation id to the request and echoes it on the
 * response (CLAUDE.md §8).
 *
 * Exported because global guards run BEFORE interceptors: a 401 from
 * JwtAuthGuard or a 403 from ProfileCompleteGuard never reaches the
 * interceptor, and those are precisely the errors worth correlating. The
 * exception filter calls this too, so every response carries the header
 * regardless of how early the request died.
 */
export function ensureCorrelationId(req: Request, res: Response): string {
  const existing = (req as Request & { correlationId?: string })[
    CORRELATION_ID_PROP
  ];
  if (existing) return existing;

  // Honour an upstream id only if it is a well-formed UUID — an unvalidated
  // client-supplied string ends up in the logs.
  const inbound = req.get(CORRELATION_ID_HEADER);
  const id = inbound && UUID_PATTERN.test(inbound) ? inbound : randomUUID();

  (req as Request & { correlationId?: string })[CORRELATION_ID_PROP] = id;
  res.setHeader(CORRELATION_ID_HEADER, id);
  return id;
}

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    ensureCorrelationId(
      http.getRequest<Request>(),
      http.getResponse<Response>(),
    );
    return next.handle();
  }
}
