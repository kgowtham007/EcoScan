import { Router } from 'express';
import type { Request, Response } from 'express';
import { auth, firestore } from '../lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();

/**
 * POST /api/auth/verify
 *
 * Verifies a Firebase ID token and handles login tracking:
 * - On success: reset failedLoginAttempts = 0 and accountLockedUntil = null; return { uid, email, emailVerified }
 * - On failure (invalid token): increment failedLoginAttempts; if count reaches 3, set accountLockedUntil = now + 15min; return 401
 * - If account is already locked: return 423 immediately without incrementing counter
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({
      error: 'Missing token in request body.',
      code: 'MISSING_TOKEN',
      retryable: false,
      requestId: req.requestId ?? crypto.randomUUID(),
    });
    return;
  }

  const requestId = req.requestId ?? crypto.randomUUID();

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;

    // Successful verification — reset lockout fields
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set(
      { failedLoginAttempts: 0, accountLockedUntil: null },
      { merge: true },
    );

    res.json({
      uid: decoded.uid,
      email: decoded.email ?? '',
      emailVerified: decoded.email_verified ?? false,
    });
  } catch {
    // Token is invalid — we need a uid to track attempts, but we can't decode it.
    // Extract uid from the token payload without verification (best-effort).
    const rawUid = extractUidFromToken(token);

    if (!rawUid) {
      res.status(401).json({
        error: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
        retryable: true,
        requestId,
      });
      return;
    }

    const userRef = firestore.collection('users').doc(rawUid);
    const userSnap = await userRef.get();
    const data = userSnap.exists ? userSnap.data() : null;

    // Check if already locked — return 423 without incrementing
    const lockedUntil = data?.accountLockedUntil;
    if (lockedUntil) {
      const lockedUntilMs: number =
        typeof lockedUntil.toMillis === 'function'
          ? lockedUntil.toMillis()
          : Number(lockedUntil);

      if (lockedUntilMs > Date.now()) {
        res.status(423).json({
          error: 'Account locked for 15 minutes due to multiple failed attempts.',
          code: 'ACCOUNT_LOCKED',
          retryable: false,
          requestId,
        });
        return;
      }
    }

    // Increment failed attempts
    const currentAttempts: number = data?.failedLoginAttempts ?? 0;
    const newAttempts = currentAttempts + 1;

    const update: Record<string, unknown> = { failedLoginAttempts: newAttempts };

    if (newAttempts >= 3) {
      update['accountLockedUntil'] = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
    }

    await userRef.set(update, { merge: true });

    res.status(401).json({
      error: 'Session expired. Please log in again.',
      code: 'TOKEN_EXPIRED',
      retryable: true,
      requestId,
    });
  }
});

/**
 * Decode the JWT payload without verification to extract the uid (sub claim).
 * Returns null if the token is malformed.
 */
function extractUidFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      sub?: string;
    };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export { router as authRouter };
