// src/controllers/video.controller.ts
// Public video call controller with proper error handling

import { Request, Response } from 'express';
import { videoService, VideoServiceError } from '../services/video.service';

export class VideoController {

  async joinVideoCall(req: Request, res: Response): Promise<void> {
    try {
      const { displayName } = req.body;

      // ── Input validation ────────────────────────────────────────
      if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'displayName is required and must be a non-empty string.',
            retryable: false,
          },
        });
        return;
      }

      if (displayName.trim().length > 256) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'displayName must be 256 characters or fewer.',
            retryable: false,
          },
        });
        return;
      }

      console.log(`[CONTROLLER] User joining: ${displayName}`);

      // ── Start the video call ────────────────────────────────────
      const response = await videoService.startWebRTCVideoCall(displayName.trim());

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      console.error('[CONTROLLER] Error:', error);

      // ── Structured VideoServiceError ────────────────────────────
      if (error instanceof VideoServiceError) {
        const retryable = [429, 503].includes(error.statusCode);

        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryable,
            ...(error.details ? { details: error.details } : {}),
          },
        });
        return;
      }

      // ── Unexpected / uncaught errors ────────────────────────────
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? error.message || 'An unexpected error occurred.'
              : 'An unexpected error occurred. Please try again later.',
          retryable: false,
        },
      });
    }
  }

  /**
   * GET /api/video/health
   * Health check endpoint
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      service: 'video-call-service',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/video/disconnect-reason?contactId=xxx
   * Returns the disconnect reason by polling DescribeContact.
   */
  async getDisconnectReason(req: Request, res: Response): Promise<void> {
    try {
      const contactId = req.query.contactId as string;
      if (!contactId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'contactId is required',
            retryable: false,
          },
        });
        return;
      }

      console.log(`[CONTROLLER] Fetching disconnect reason for: ${contactId}`);
      const data = await videoService.getDisconnectReason(contactId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[CONTROLLER] getDisconnectReason Error:', error);

      if (error instanceof VideoServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryable: false,
            ...(error.details ? { details: error.details } : {}),
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred.',
          retryable: false,
        },
      });
    }
  }
}

export const videoController = new VideoController();