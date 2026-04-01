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
 * 
 * Join a public video call
 * Anyone can call this endpoint
 * 
 * Example:
 * POST http://localhost:3000/api/video/join
 * Content-Type: application/json
 * 
 * Request:
 * {
 *   "displayName": "John Doe"
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "contactId": "contact-123",
 *     "participantToken": "token-xyz",
 *     "meeting": {
 *       "MediaPlacement": { ... },
 *       "MeetingId": "meeting-123"
 *     },
 *     "attendee": {
 *       "AttendeeId": "attendee-123",
 *       "JoinToken": "join-token"
 *     }
 *   }
 * }
 * 
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "INVALID_NAME",
 *     "message": "displayName is required"
 *   }
 * }
 * 
 * Error Response (500):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "SERVICE_ERROR",
 *     "message": "Failed to join video call"
 *   }
 * }
 */
videoRouter.post('/join', (req: Request, res: Response) => {
  videoController.joinVideoCall(req, res);
});

/**
 * GET /api/video/disconnect-reason
 */
videoRouter.get('/disconnect-reason', (req: Request, res: Response) => {
  videoController.getDisconnectReason(req, res);
});

export default videoRouter;