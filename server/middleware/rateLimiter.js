
import rateLimit from 'express-rate-limit';

export const generatePlanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Too many plan generation requests. Please try again later.",
  },
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});
