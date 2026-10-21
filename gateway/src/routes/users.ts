import { Router } from 'express';
import type { Request, Response } from 'express';
import { firestore } from '../lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();

const ALLOWED_PROFILE_FIELDS = ['displayName', 'city', 'college', 'photoURL'] as const;
type AllowedField = (typeof ALLOWED_PROFILE_FIELDS)[number];

/**
 * PATCH /:userId/profile
 * Updates allowed profile fields. Returns 401 if unauthenticated, 403 if not owner.
 */
router.patch('/:userId/profile', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };
  const requestId = req.requestId ?? crypto.randomUUID();

  if (!req.user) {
    res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED', retryable: true, requestId });
    return;
  }

  if (req.user.uid !== userId) {
    res.status(403).json({ error: 'Forbidden: you do not have permission to update this profile.', code: 'FORBIDDEN', retryable: false, requestId });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const update: Partial<Record<AllowedField | 'updatedAt', unknown>> = {};
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  update['updatedAt'] = Timestamp.now();

  await firestore.collection('users').doc(userId).set(update, { merge: true });
  res.json({ message: 'Profile updated successfully.', updated: update });
});

/**
 * DELETE /:userId
 * Schedules account deletion within 30 days. Returns 401/403 on auth failures.
 */
router.delete('/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };
  const requestId = req.requestId ?? crypto.randomUUID();

  if (!req.user) {
    res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED', retryable: true, requestId });
    return;
  }

  if (req.user.uid !== userId) {
    res.status(403).json({ error: 'Forbidden: you do not have permission to delete this account.', code: 'FORBIDDEN', retryable: false, requestId });
    return;
  }

  await firestore.collection('users').doc(userId).set(
    { deletionScheduledAt: Timestamp.now(), deletionStatus: 'pending' },
    { merge: true },
  );

  res.json({ message: 'Account deletion scheduled within 30 days.' });
});

export { router as usersRouter };
