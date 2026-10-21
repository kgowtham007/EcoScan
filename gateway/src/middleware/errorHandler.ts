import type { Request, Response, NextFunction } from 'express';

/**
 * AppError — custom error class for known application error codes.
 * Throw this anywhere in the gateway to produce a normalized error response.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Map of known error codes → { statusCode, retryable } */
const ERROR_MAP: Record<string, { statusCode: number; retryable: boolean }> = {
  AI_TIMEOUT:        { statusCode: 504, retryable: true },
  AI_SERVICE_ERROR:  { statusCode: 502, retryable: true },
  NO_ITEM_DETECTED:  { statusCode: 422, retryable: true },
  INVALID_IMAGE:     { statusCode: 400, retryable: false },
  BARCODE_NOT_FOUND: { statusCode: 404, retryable: false },
  LOCATION_DENIED:   { statusCode: 403, retryable: false },
  SMART_BIN_TIMEOUT: { statusCode: 408, retryable: false },
  TOKEN_EXPIRED:     { statusCode: 401, retryable: true },
  ACCOUNT_LOCKED:    { statusCode: 423, retryable: false },
  RATE_LIMITED:      { statusCode: 429, retryable: true },
};

/**
 * errorHandler — Express 4-argument error-handling middleware.
 * Normalizes all errors to { error, code, retryable, requestId }.
 * Must be registered as the LAST middleware in the stack.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId: string = req.requestId ?? crypto.randomUUID();

  // Known AppError — use its fields directly
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      retryable: err.retryable,
      requestId,
    });
    return;
  }

  // Plain Error with a known code string attached
  if (err instanceof Error && 'code' in err) {
    const code = (err as { code: string }).code;
    const mapping = ERROR_MAP[code];
    if (mapping) {
      res.status(mapping.statusCode).json({
        error: err.message,
        code,
        retryable: mapping.retryable,
        requestId,
      });
      return;
    }
  }

  // Unknown / unexpected error → 500
  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';

  res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
    retryable: false,
    requestId,
  });
}
