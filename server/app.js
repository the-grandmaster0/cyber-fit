import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import plansRoutes from './routes/plans.js';
import logsRoutes from './routes/logs.js';
import progressRoutes from './routes/progress.js';

dotenv.config();

const app = express();

// Allowed browser origins for CORS.
// In development the Vite dev server is always allowed.
// In production CLIENT_ORIGIN must be set to the deployed frontend URL.
const allowedOrigins = [
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header — these are direct server calls,
      // health checks, Vercel's serverless runtime, curl, Postman, etc.
      if (!origin) {
        return callback(null, true);
      }
      // Allow known browser origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/progress', progressRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export { app };
export default app;
