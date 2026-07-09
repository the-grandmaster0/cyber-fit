
import rateLimit from 'express-rate-limit';

export const generatePlanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 generations per user per 15 min
  // Key by authenticated user ID instead of IP address.
  // This is important when running behind a reverse proxy (Vercel, Nginx, etc.)
  // where all requests arrive from the same proxy IP.
  keyGenerator: (req) => {
    // Use authenticated user ID when available (avoids shared-IP issues behind proxies).
    // Fall back to IP, normalizing IPv6-mapped IPv4 addresses (::ffff:1.2.3.4 → 1.2.3.4).
    if (req.user?.id) return req.user.id;
    const ip = req.ip || '';
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  },
  message: {
    error: "Too many plan generation requests. Please try again in 15 minutes.",
  },
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
