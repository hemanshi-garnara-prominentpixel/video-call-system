// src/routes/video.routes.ts
// SIMPLIFIED VERSION - Public video call

import { Router, Request, Response } from 'express';
import { videoController } from '../controllers/video.controller';

const videoRouter = Router();

/**
 * GET /api/video/health
 * Health check
 */
videoRouter.get('/health', (req: Request, res: Response) => {
  videoController.healthCheck(req, res);
});

/**
 * POST /api/video/join
 * Join a public video call
 */
videoRouter.post('/join', (req: Request, res: Response) => {
  videoController.joinVideoCall(req, res);
});

export default videoRouter;