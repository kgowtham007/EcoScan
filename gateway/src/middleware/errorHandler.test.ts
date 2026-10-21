import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from './errorHandler';

function mockReq(requestId?: string): Request {
  return { requestId } as unknown as Request;
}

function mockRes() {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockImplementation((body: unknown) => {
    res._body = body;
  });
  return res;
}

const next: NextFunction = vi.fn();

function callHandler(err: unknown, requestId?: string) {
  const req = mockReq(requestId);
  const res = mockRes();
  errorHandler(err, req, res as unknown as Response, next);
  return res;
}

describe('errorHandler middleware', () => {
  const cases: Array<[string, number, boolean]> = [
    ['AI_TIMEOUT',        504, true],
    ['AI_SERVICE_ERROR',  502, true],
    ['NO_ITEM_DETECTED',  422, true],
    ['INVALID_IMAGE',     400, false],
    ['BARCODE_NOT_FOUND', 404, false],
    ['LOCATION_DENIED',   403, false],
    ['SMART_BIN_TIMEOUT', 408, false],
    ['TOKEN_EXPIRED',     401, true],
    ['ACCOUNT_LOCKED',    423, false],
    ['RATE_LIMITED',      429, true],
  ];

  it.each(cases)('AppError %s → HTTP %i, retryable=%s', (code, statusCode, retryable) => {
    const err = new AppError('test message', code, statusCode, retryable);
    const res = callHandler(err, 'req-123');
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res._body).toMatchObject({ error: 'test message', code, retryable, requestId: 'req-123' });
  });

  it('maps plain Error with known code', () => {
    const err = Object.assign(new Error('timeout'), { code: 'AI_TIMEOUT' });
    const res = callHandler(err, 'req-abc');
    expect(res.status).toHaveBeenCalledWith(504);
    expect(res._body).toMatchObject({ code: 'AI_TIMEOUT', retryable: true });
  });

  it('returns 500 INTERNAL_ERROR for unknown Error', () => {
    const res = callHandler(new Error('oops'), 'req-xyz');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res._body).toMatchObject({ code: 'INTERNAL_ERROR', retryable: false });
  });

  it('generates a UUID when req.requestId is absent', () => {
    const err = new AppError('msg', 'INVALID_IMAGE', 400, false);
    const res = callHandler(err, undefined);
    expect((res._body as { requestId: string }).requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
