import type { Request, Response, NextFunction } from 'express';
import { auth, firestore } from '../lib/firebaseAdmin';

/**
 * jwtVerify middleware
 *
 * - If no Authorization header is present, calls next() without setting req.user
 *   (allows public routes to work).
 * - On a valid token, checks Firestore users/{uid}.accountLockedUntil.
 *   If locked, returns 423 ACCOUNT_LOCKED.
 * - On success, attaches { uid, email, emailVerified } to req.user and calls next().
 * - On expired / invalid token, returns 401 TOKEN_EXPIRED.
 */
export async function jwtVerify(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const requestId: string = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
  req.requestId = requestId;

  const authHeader = req.headers['authorization'];

  // No token — allow public routes through
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = await auth.verifyIdToken(token);

    // Check account lockout in Firestore
    const userRef = firestore.collection('users').doc(decoded.uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const data = userSnap.data();
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
    }

    // Attach user claims to request
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      emailVerified: decoded.email_verified ?? false,
    };

    next();
  } catch (err: unknown) {
    // Firebase Admin throws errors with a code property for token issues
    const code =
      err instanceof Error && 'code' in err ? (err as { code: string }).code : '';

    const isExpiredOrInvalid =
      code === 'auth/id-token-expired' ||
      code === 'auth/argument-error' ||
      code === 'auth/id-token-revoked' ||
      code === 'auth/invalid-id-token' ||
      code.startsWith('auth/');

    if (isExpiredOrInvalid) {
      res.status(401).json({
        error: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
        retryable: true,
        requestId,
      });
      return;
    }

    // Unexpected error — pass to error handler
    next(err);
  }
}
