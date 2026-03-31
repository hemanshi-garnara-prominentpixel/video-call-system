// src/app.ts
// SIMPLIFIED - Public Video Call Backend

import express from 'express';
import cors from 'cors';
import videoRoutes from './routes/video.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/video', videoRoutes);

// Server health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'video-call-backend',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

export default app;