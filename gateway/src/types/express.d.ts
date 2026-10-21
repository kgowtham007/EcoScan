// Augment Express Request to carry decoded Firebase user claims
declare namespace Express {
  interface Request {
    user?: {
      uid: string;
      email: string;
      emailVerified: boolean;
    };
    requestId?: string;
  }
}
