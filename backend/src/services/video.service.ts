import {
  ConnectClient,
  StartWebRTCContactCommand,
} from '@aws-sdk/client-connect';
import { envConfig } from '../config/env';
import {
  StartVideoCallRequest,
  StartVideoCallResponse,
} from '../types/video.types';

// ── Structured error for clean propagation ──────────────────────────
export class VideoServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'VideoServiceError';
  }
}

export class VideoService {
  private connectClient: ConnectClient;

  constructor() {
    this.connectClient = new ConnectClient({
      region: envConfig.aws.region,
    });
  }

  async startWebRTCVideoCall(
    displayName: string,
  ): Promise<StartVideoCallResponse> {
    // ── Input guard ─────────────────────────────────────────────────
    if (!displayName || displayName.trim().length === 0) {
      throw new VideoServiceError(
        'displayName is required',
        'INVALID_INPUT',
        400,
      );
    }

    if (!envConfig.connect.instanceId) {
      throw new VideoServiceError(
        'CONNECT_INSTANCE_ID is not configured on the server',
        'CONFIG_ERROR',
        500,
      );
    }

    if (!envConfig.connect.videoFlowId) {
      throw new VideoServiceError(
        'CONNECT_VIDEO_FLOW_ID is not configured on the server',
        'CONFIG_ERROR',
        500,
      );
    }

    try {
      console.log(`[VIDEO] Starting video call for: ${displayName}`);

      const startContactResponse = await this.connectClient.send(
        new StartWebRTCContactCommand({
          InstanceId: envConfig.connect.instanceId,
          ContactFlowId: envConfig.connect.videoFlowId,
          ParticipantDetails: {
            DisplayName: displayName,
          },
          Attributes: {
            callType: 'public-video-link',
            timestamp: new Date().toISOString(),
          },
          AllowedCapabilities: {
            Customer: {
              Video: 'SEND',
              ScreenShare: 'SEND',
            },
            Agent: {
              Video: 'SEND',
              ScreenShare: 'SEND',
            },
          },
        }),
      );

      console.log(
        `[VIDEO] Response received, ContactId: ${startContactResponse.ContactId}`,
      );

      // ── Validate critical response fields ─────────────────────────
      if (!startContactResponse.ContactId) {
        throw new VideoServiceError(
          'AWS Connect did not return a ContactId — the contact may not have been created.',
          'MISSING_CONTACT_ID',
          502,
        );
      }

      if (!startContactResponse.ParticipantToken) {
        throw new VideoServiceError(
          'AWS Connect did not return a ParticipantToken — participant registration may have failed.',
          'MISSING_PARTICIPANT_TOKEN',
          502,
        );
      }

      const connectionData = startContactResponse.ConnectionData;

      if (!connectionData) {
        throw new VideoServiceError(
          'AWS Connect did not return ConnectionData — the WebRTC session may not have initialised.',
          'MISSING_CONNECTION_DATA',
          502,
        );
      }

      if (!connectionData.Meeting) {
        throw new VideoServiceError(
          'Meeting object is missing from ConnectionData — the Chime meeting was not provisioned.',
          'MISSING_MEETING',
          502,
        );
      }

      if (!connectionData.Attendee) {
        throw new VideoServiceError(
          'Attendee object is missing from ConnectionData — the attendee was not registered in the meeting.',
          'MISSING_ATTENDEE',
          502,
        );
      }

      console.log(
        `[VIDEO] Contact created successfully: ${startContactResponse.ContactId}`,
      );

      return {
        contactId: startContactResponse.ContactId,
        participantToken: startContactResponse.ParticipantToken,
        meeting: connectionData.Meeting,
        attendee: connectionData.Attendee,
      };
    } catch (error: any) {
      // Re-throw our own errors as-is
      if (error instanceof VideoServiceError) {
        throw error;
      }

      // ── Classify AWS SDK errors ───────────────────────────────────
      const awsErrorName: string = error?.name || error?.__type || '';
      const awsMessage: string = error?.message || 'Unknown AWS error';

      console.error('[VIDEO] AWS error:', {
        name: awsErrorName,
        message: awsMessage,
        code: error?.$metadata?.httpStatusCode,
      });

      // Throttling / rate-limit
      if (
        awsErrorName === 'ThrottlingException' ||
        awsErrorName === 'TooManyRequestsException'
      ) {
        throw new VideoServiceError(
          'Too many video call requests — please wait a moment and try again.',
          'RATE_LIMITED',
          429,
        );
      }

      // Auth / permissions
      if (
        awsErrorName === 'AccessDeniedException' ||
        awsErrorName === 'UnauthorizedException' ||
        awsErrorName === 'InvalidAccessKeyId' ||
        awsErrorName === 'SignatureDoesNotMatch'
      ) {
        throw new VideoServiceError(
          'The server does not have permission to create video calls. Check AWS credentials and IAM policies.',
          'AUTH_ERROR',
          403,
        );
      }

      // Bad parameters
      if (
        awsErrorName === 'InvalidParameterException' ||
        awsErrorName === 'ValidationException'
      ) {
        throw new VideoServiceError(
          `Invalid configuration: ${awsMessage}`,
          'INVALID_PARAMS',
          400,
        );
      }

      // Resource not found (bad instance ID / flow ID)
      if (
        awsErrorName === 'ResourceNotFoundException' ||
        awsErrorName === 'ContactFlowNotPublishedException'
      ) {
        throw new VideoServiceError(
          'The Connect instance or contact flow was not found — check CONNECT_INSTANCE_ID and CONNECT_VIDEO_FLOW_ID.',
          'RESOURCE_NOT_FOUND',
          404,
        );
      }

      // Service unavailable
      if (
        awsErrorName === 'InternalServiceException' ||
        awsErrorName === 'ServiceQuotaExceededException'
      ) {
        throw new VideoServiceError(
          'AWS Connect service is temporarily unavailable. Please try again later.',
          'SERVICE_UNAVAILABLE',
          503,
        );
      }

      // Network / connectivity
      if (
        awsMessage.includes('getaddrinfo') ||
        awsMessage.includes('ECONNREFUSED') ||
        awsMessage.includes('ETIMEDOUT') ||
        awsMessage.includes('NetworkingError')
      ) {
        throw new VideoServiceError(
          'Could not reach AWS services — check the server\'s internet connection.',
          'NETWORK_ERROR',
          503,
        );
      }

      // Fallback
      throw new VideoServiceError(
        awsMessage,
        'AWS_ERROR',
        error?.$metadata?.httpStatusCode || 500,
        { awsErrorName },
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.connectClient.destroy();
    } catch (error) {
      console.error('[VIDEO] Error disconnecting client:', error);
    }
  }
}

export const videoService = new VideoService();