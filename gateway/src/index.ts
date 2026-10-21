import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { publicLimiter, authenticatedLimiter, classifyLimiter } from './middleware/rateLimiter';
import { jwtVerify } from './middleware/jwtVerify';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';

const app = express();
const PORT = process.env['PORT'] ?? 4000;

// Parse ALLOWED_ORIGINS from env (comma-separated)
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ── Middleware stack (applied in order per design) ──────────────────────────

// 1. Security headers
app.use(helmet());

// 2. CORS — origin whitelist from ALLOWED_ORIGINS env var
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));

// 3. Rate limiting
//    3a. Public limiter: 60 req/min on all routes
app.use(publicLimiter);
//    3b. Classify limiter: 20 req/min on POST /api/classify
app.post('/api/classify', classifyLimiter);
//    3c. Authenticated limiter: 200 req/min — applied per-route after jwtVerify (see 2.2)
export { authenticatedLimiter };

// 4. Request logging
app.use(morgan('combined'));

// 5. Body parsing
app.use(express.json({ limit: '11mb' }));

// 6. JWT verification
app.use(jwtVerify);

// 7. Error handler — normalizes all errors to { error, code, retryable, requestId }
app.use(errorHandler);

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});

export default app;
