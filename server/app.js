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

// CORS — strictly restrict to known origins only.
// In production CLIENT_ORIGIN must be set to the deployed Vercel URL.
// In development the Vite dev server origin is also allowed.
const allowedOrigins = [
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

if (allowedOrigins.length === 0) {
  throw new Error(
    'CORS misconfiguration: CLIENT_ORIGIN environment variable is required'
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin only in development (curl, Postman, etc.)
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin || '(none)'} not allowed`));
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
