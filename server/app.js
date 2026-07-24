import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import engagementRoutes from './routes/engagementRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import systemConfigRoutes from './routes/systemConfigRoutes.js';
import websiteRoutes from './routes/websiteRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware.js';
import { mongoSanitizeMiddleware, xssSanitizeMiddleware } from './middleware/sanitize.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalApiLimiter } from './middleware/rateLimiter.js';
import { getAllowedOrigins } from './config/security.js';
import logger from './utils/logger.js';

// This file builds the Express app but does NOT start listening on a port
// and does NOT connect to the database. That separation means we can import
// `app` in automated tests (e.g. with supertest) without needing a real
// running server — server.js is the only file that actually boots things.
const app = express();

// ── 1. Security headers (Helmet) ─────────────────────────────────────────────
// Must come before everything else so all responses get the headers.
app.use(
  helmet({
    // Content-Security-Policy: restrict what resources can be loaded.
    // The API does not serve HTML/JS, but CSP still protects any error pages.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    // HTTP Strict Transport Security: tell browsers to use HTTPS for 1 year.
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking by forbidding this API from being embedded in frames.
    frameguard: { action: 'deny' },
    // Prevent MIME-type sniffing — browser must honour declared Content-Type.
    noSniff: true,
    // Opt out of browser DNS prefetching (reduces information leakage).
    dnsPrefetchControl: { allow: false },
    // Remove the X-Powered-By: Express header.
    hidePoweredBy: true,
    // Referrer-Policy: only send origin (no path) on cross-origin requests.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // X-XSS-Protection is deprecated in modern browsers but harmless for legacy ones.
    xssFilter: true,
  })
);

// ── 2. CORS ───────────────────────────────────────────────────────────────────
// getAllowedOrigins() parses comma-separated CLIENT_URL env var so staging and
// production origins can be whitelisted without code changes.
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      // or from a whitelisted origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const err = new Error(`CORS policy violation`);
      err.status = 403;
      callback(err);
    },
    credentials: true,
  })
);

// ── 3. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── 4. Input sanitization ─────────────────────────────────────────────────────
// NoSQL injection protection: strips MongoDB operators ($, .) from user input.
app.use(mongoSanitizeMiddleware);
// XSS protection: escapes HTML/JS in all string fields of body/query/params.
app.use(xssSanitizeMiddleware);

// ── 5. Request logging ────────────────────────────────────────────────────────
// Lightweight structured request log — method, path, status, duration.
// Does NOT log cookies, authorization headers, or request bodies.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
});

// ── 6. Maintenance gate ───────────────────────────────────────────────────────
app.use(maintenanceMiddleware);

// ── 7. Health check (unchanged, bypasses rate limit) ─────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── 8. Global rate limiter ────────────────────────────────────────────────────
// Applied as a catch-all backstop — individual routes have their own tighter
// limiters (see rateLimiter.js). Placed here so health check bypasses it, but
// it actively protects all actual API routes below.
app.use(globalApiLimiter);

// ── 9. Routes (order and paths are identical to original) ─────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/auth/sessions', sessionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/system/config', systemConfigRoutes);
app.use('/api/website', websiteRoutes);

// ── 10. Centralized error handler ─────────────────────────────────────────────
// Must be the LAST middleware. Replaces the previous inline error handler.
// Never leaks stack traces to the client in production.
app.use(errorHandler);

export default app;

