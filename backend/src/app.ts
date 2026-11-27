import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { globalRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import hospitalsRoutes from './modules/hospitals/hospitals.routes';
import adminHospitalsRoutes from './modules/hospitals/admin-hospitals.routes';
import membershipsRoutes from './modules/memberships/memberships.routes';
import clinicalRoutes from './modules/clinical/clinical.routes';
import operationsRoutes from './modules/operations/operations.routes';
import aiRoutes from './modules/ai/ai.routes';
import securityRoutes from './modules/security/security.routes';
import saasRoutes from './modules/saas/saas.routes';
import directoryRoutes from './modules/directory/directory.routes';
import { securityStore } from './modules/security/security.service';
import { directoryStore } from './modules/directory/directory.service';

export function createApp() {
  const app = express();

  // HTTP request logging for debugging and observability
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Hospital-Id', 'X-Razorpay-Signature'],
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(globalRateLimiter);

  // Track request count for observability
  app.use((_req, _res, next) => {
    securityStore.metrics.totalApiRequests += 1;
    next();
  });

  // Phase 8 Health Endpoints (/health, /health/live, /health/ready)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      service: 'MediCore Enterprise Healthcare Platform API',
      version: '9.0.0',
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/live', (_req, res) => {
    res.status(200).json({
      success: true,
      liveness: 'ALIVE',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', (_req, res) => {
    res.status(200).json({
      success: true,
      readiness: 'READY',
      directoryRecordsLoaded: directoryStore.records.size,
      timestamp: new Date().toISOString(),
    });
  });

  // Versioned REST API Routes (/api/v1)
  const apiPrefix = env.API_PREFIX;
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/hospitals`, hospitalsRoutes);
  app.use(`${apiPrefix}`, membershipsRoutes);
  app.use(`${apiPrefix}/admin`, adminHospitalsRoutes);
  app.use(`${apiPrefix}`, clinicalRoutes);
  app.use(`${apiPrefix}`, operationsRoutes);
  app.use(`${apiPrefix}/ai`, aiRoutes);
  app.use(`${apiPrefix}`, securityRoutes);
  app.use(`${apiPrefix}`, saasRoutes);
  app.use(`${apiPrefix}`, directoryRoutes);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
