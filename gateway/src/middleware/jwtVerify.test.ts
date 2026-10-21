import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mock Firebase Admin ──────────────────────────────────────────────────────
const mockVerifyIdToken = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('../lib/firebaseAdmin', () => ({
  auth: { verifyIdToken: mockVerifyIdToken },
  firestore: { collection: mockCollection },
}));

// Import after mocks are set up
const { jwtVerify } = await import('./jwtVerify');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function makeRes(): { res: Partial<Response>; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Partial<Response>, status, json };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('jwtVerify middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() without setting req.user when no Authorization header', async () => {
    const req = makeReq() as Request;
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error arg
    expect(req.user).toBeUndefined();
  });

  it('calls next() without setting req.user when Authorization header is not Bearer', async () => {
    const req = makeReq('Basic sometoken') as Request;
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it('attaches req.user and calls next() on a valid, unlocked token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com',
      email_verified: true,
    });
    mockGet.mockResolvedValue({ exists: true, data: () => ({ accountLockedUntil: null }) });

    const req = makeReq('Bearer validtoken') as Request;
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(req.user).toEqual({ uid: 'user123', email: 'test@example.com', emailVerified: true });
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 423 ACCOUNT_LOCKED when accountLockedUntil is in the future', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com',
      email_verified: true,
    });
    const futureMs = Date.now() + 10 * 60 * 1000; // 10 min from now
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        accountLockedUntil: { toMillis: () => futureMs },
      }),
    });

    const req = makeReq('Bearer validtoken') as Request;
    const { res, status, json } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(423);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ACCOUNT_LOCKED', retryable: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('does NOT lock when accountLockedUntil is in the past', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com',
      email_verified: false,
    });
    const pastMs = Date.now() - 1000; // 1 second ago
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        accountLockedUntil: { toMillis: () => pastMs },
      }),
    });

    const req = makeReq('Bearer validtoken') as Request;
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(req.user).toEqual({ uid: 'user123', email: 'test@example.com', emailVerified: false });
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 401 TOKEN_EXPIRED on expired token error', async () => {
    const err = Object.assign(new Error('Token expired'), { code: 'auth/id-token-expired' });
    mockVerifyIdToken.mockRejectedValue(err);

    const req = makeReq('Bearer expiredtoken') as Request;
    const { res, status, json } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED', retryable: true }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 TOKEN_EXPIRED on invalid token error', async () => {
    const err = Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' });
    mockVerifyIdToken.mockRejectedValue(err);

    const req = makeReq('Bearer badtoken') as Request;
    const { res, status, json } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED', retryable: true }),
    );
  });

  it('calls next(err) for unexpected non-auth errors', async () => {
    const unexpectedErr = new Error('Network failure');
    mockVerifyIdToken.mockRejectedValue(unexpectedErr);

    const req = makeReq('Bearer sometoken') as Request;
    const { res } = makeRes();
    const next = vi.fn() as NextFunction;

    await jwtVerify(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(unexpectedErr);
  });
});
