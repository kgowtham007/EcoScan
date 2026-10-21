import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('../lib/firebaseAdmin', () => ({
  firestore: { collection: mockCollection },
}));

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: { now: () => ({ seconds: 1000, nanoseconds: 0 }) },
}));

const { usersRouter } = await import('./users');

function makeReq(
  params: Record<string, string>,
  body: Record<string, unknown> = {},
  user?: { uid: string; email: string; emailVerified: boolean },
): Partial<Request> {
  return { params, body, user, requestId: 'test-req-id' } as Partial<Request>;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Partial<Response>, status, json };
}

function getHandler(method: 'patch' | 'delete', path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = (usersRouter as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return layer.route.stack[0].handle as (req: Request, res: Response) => Promise<void>;
}

describe('PATCH /:userId/profile', () => {
  const handler = getHandler('patch', '/:userId/profile');

  beforeEach(() => { vi.clearAllMocks(); mockSet.mockResolvedValue(undefined); });

  it('succeeds for owner', async () => {
    const req = makeReq({ userId: 'u1' }, { displayName: 'Alice', city: 'Mumbai' }, { uid: 'u1', email: 'a@b.com', emailVerified: true }) as Request;
    const { res, json } = makeRes();
    await handler(req, res as Response);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Alice', city: 'Mumbai' }), { merge: true });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Profile updated successfully.' }));
  });

  it('strips non-allowed fields', async () => {
    const req = makeReq({ userId: 'u1' }, { displayName: 'Alice', ecoPoints: 9999 }, { uid: 'u1', email: 'a@b.com', emailVerified: true }) as Request;
    const { res } = makeRes();
    await handler(req, res as Response);
    const arg = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg['ecoPoints']).toBeUndefined();
  });

  it('returns 403 for non-owner', async () => {
    const req = makeReq({ userId: 'u1' }, {}, { uid: 'u2', email: 'b@b.com', emailVerified: true }) as Request;
    const { res, status } = makeRes();
    await handler(req, res as Response);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const req = makeReq({ userId: 'u1' }) as Request;
    const { res, status } = makeRes();
    await handler(req, res as Response);
    expect(status).toHaveBeenCalledWith(401);
  });
});

describe('DELETE /:userId', () => {
  const handler = getHandler('delete', '/:userId');

  beforeEach(() => { vi.clearAllMocks(); mockSet.mockResolvedValue(undefined); });

  it('succeeds for owner and schedules deletion', async () => {
    const req = makeReq({ userId: 'u1' }, {}, { uid: 'u1', email: 'a@b.com', emailVerified: true }) as Request;
    const { res, json } = makeRes();
    await handler(req, res as Response);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ deletionStatus: 'pending' }), { merge: true });
    expect(json).toHaveBeenCalledWith({ message: 'Account deletion scheduled within 30 days.' });
  });

  it('returns 403 for non-owner', async () => {
    const req = makeReq({ userId: 'u1' }, {}, { uid: 'u2', email: 'b@b.com', emailVerified: true }) as Request;
    const { res, status } = makeRes();
    await handler(req, res as Response);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const req = makeReq({ userId: 'u1' }) as Request;
    const { res, status } = makeRes();
    await handler(req, res as Response);
    expect(status).toHaveBeenCalledWith(401);
  });
});
