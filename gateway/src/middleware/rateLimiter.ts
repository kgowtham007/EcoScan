import rateLimit from 'express-rate-limit';

// Public limiter: 60 req/min per IP on all routes
export const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    code: 'RATE_LIMITED',
    retryable: true,
  },
});

// Authenticated limiter: 200 req/min per IP on authenticated routes
export const authenticatedLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    code: 'RATE_LIMITED',
    retryable: true,
  },
});

// Classify limiter: 20 req/min per IP specifically on POST /api/classify
export const classifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    code: 'RATE_LIMITED',
    retryable: true,
  },
});
