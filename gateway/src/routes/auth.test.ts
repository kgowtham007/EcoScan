import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ── Mock Firebase Admin ──────────────────────────────────────────────────────
const mockVerifyIdToken = vi.fn();
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('../lib/firebaseAdmin', () => ({
  auth: { verifyIdToken: mockVerifyIdToken },
  firestore: { collection: mockCollection },
}));

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms, _ms: ms }),
  },
}));

// Import after mocks
const { authRouter } = await import('./auth');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal JWT-shaped token with the given uid as the `sub` claim.
 * The token is NOT cryptographically valid — it's only used to test the
 * uid-extraction path in the route.
 */
function makeToken(uid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: uid, uid })).toString('base64url');
  return `${header}.${payload}.fakesig`;
}

function makeReq(body: Record<string, unknown> = {}): Partial<Request> {
  return { body, requestId: 'test-request-id' };
}

function makeRes(): {
  res: Partial<Response>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Partial<Response>, status, json };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /verify', () => {
  // Grab the route handler directly from the router stack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (authRouter as any).stack[0].route.stack[0].handle as (
    req: Request,
    res: Response,
  ) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Success path ────────────────────────────────────────────────────────

  it('resets lockout fields and returns user info on successful verify', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user1',
      email: 'user@example.com',
      email_verified: true,
    });
    mockSet.mockResolvedValue(undefined);

    const req = makeReq({ token: 'valid-token' }) as Request;
    const { res, json } = makeRes();

    await handler(req, res as Response);

    expect(mockSet).toHaveBeenCalledWith(
      { failedLoginAttempts: 0, accountLockedUntil: null },
      { merge: true },
    );
    expect(json).toHaveBeenCalledWith({
      uid: 'user1',
      email: 'user@example.com',
      emailVerified: true,
    });
  });

  // ── Lockout increment path ──────────────────────────────────────────────

  it('increments failedLoginAttempts on invalid token (attempts < 3)', async () => {
    const uid = 'user2';
    const err = Object.assign(new Error('bad token'), { code: 'auth/invalid-id-token' });
    mockVerifyIdToken.mockRejectedValue(err);
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ failedLoginAttempts: 1, accountLockedUntil: null }),
    });
    mockSet.mockResolvedValue(undefined);

    const req = makeReq({ token: makeToken(uid) }) as Request;
    const { res, status } = makeRes();

    await handler(req, res as Response);

    expect(mockSet).toHaveBeenCalledWith({ failedLoginAttempts: 2 }, { merge: true });
    expect(status).toHaveBeenCalledWith(401);
  });

  it('sets accountLockedUntil on the 3rd failed attempt', async () => {
    const uid = 'user3';
    const err = Object.assign(new Error('bad token'), { code: 'auth/invalid-id-token' });
    mockVerifyIdToken.mockRejectedValue(err);
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ failedLoginAttempts: 2, accountLockedUntil: null }),
    });
    mockSet.mockResolvedValue(undefined);

    const req = makeReq({ token: makeToken(uid) }) as Request;
    const { res, status } = makeRes();

    await handler(req, res as Response);

    const setCall = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setCall['failedLoginAttempts']).toBe(3);
    expect(setCall['accountLockedUntil']).toBeDefined();
    expect(status).toHaveBeenCalledWith(401);
  });

  // ── Already-locked path ─────────────────────────────────────────────────

  it('returns 423 without incrementing counter when account is already locked', async () => {
    const uid = 'user4';
    const err = Object.assign(new Error('bad token'), { code: 'auth/invalid-id-token' });
    mockVerifyIdToken.mockRejectedValue(err);

    const futureMs = Date.now() + 10 * 60 * 1000;
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        failedLoginAttempts: 3,
        accountLockedUntil: { toMillis: () => futureMs },
      }),
    });

    const req = makeReq({ token: makeToken(uid) }) as Request;
    const { res, status, json } = makeRes();

    await handler(req, res as Response);

    expect(mockSet).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(423);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ACCOUNT_LOCKED', retryable: false }),
    );
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  it('returns 400 when no token is provided', async () => {
    const req = makeReq({}) as Request;
    const { res, status } = makeRes();

    await handler(req, res as Response);

    expect(status).toHaveBeenCalledWith(400);
  });
});
