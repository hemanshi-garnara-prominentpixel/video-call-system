import {
  type AudioVideoFacade,
  type AudioVideoObserver,
  type ClientMetricReport,
  MeetingSessionStatusCode,
} from 'amazon-chime-sdk-js';

export interface ChimeObserverCallbacks {
  onPoorConnection?: () => void;
  onConnectionRecovered?: () => void;
  onMetricsUpdate?: (metrics: { packetLoss: number; bitrate: number; latency: number }) => void;
  onSessionFailure?: (error: string) => void;
  onRetryAttempt?: (attemptNumber: number) => void;
  onMaxRetriesReached?: () => void;
}

/**
 * Creates and attaches a reusable observer to an Amazon Chime AudioVideo facade.
 * Handles connection quality events, extracts observable metrics, and implements
 * an automatic retry mechanism for unexpected disconnects.
 *
 * @param audioVideo - The Chime AudioVideo instance
 * @param rejoinMeeting - The function to call when attempting to rejoin the meeting
 * @param callbacks - Event hooks for UI/state updates
 * @returns A cleanup function to remove the observer and clear any pending timeouts
 */
export const createChimeObserver = (
  audioVideo: AudioVideoFacade,
  rejoinMeeting: () => Promise<void> | void,
  callbacks: ChimeObserverCallbacks
) => {
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2500;
  let retryTimeout: ReturnType<typeof setTimeout>;

  const observer: AudioVideoObserver = {
    connectionDidBecomePoor: () => {
      callbacks.onPoorConnection?.();
    },

    connectionDidBecomeGood: () => {
      callbacks.onConnectionRecovered?.();
    },

    metricsDidReceive: (clientMetricReport: ClientMetricReport) => {
      const metrics = clientMetricReport.getObservableMetrics();

      // Extract raw metrics with fallbacks
      // 'audioPacketsReceivedFractionLoss' represents fractional packet loss percentage (0-100 typically)
      // 'audioUpstreamBitrate' represents bits per second, converted here to kbps
      // 'audioSpeakerDelayMs' represents typical round-trip or local playback latency
      const packetLoss = metrics.audioPacketsReceivedFractionLoss ?? 0;
      const bitrate = (metrics.audioUpstreamBitrate ?? 0) / 1000;
      const latency = metrics.audioSpeakerDelayMs ?? 0;

      callbacks.onMetricsUpdate?.({ packetLoss, bitrate, latency });
    },

    audioVideoDidStop: (sessionStatus) => {
      const statusCode = sessionStatus.statusCode();

      const isFailure =
        statusCode === MeetingSessionStatusCode.TaskFailed ||
        statusCode === MeetingSessionStatusCode.SignalingBadRequest ||
        statusCode === MeetingSessionStatusCode.AudioDisconnected ||
        statusCode === MeetingSessionStatusCode.SignalingChannelClosedUnexpectedly;

      if (isFailure) {
        callbacks.onSessionFailure?.(`Session failed with status code: ${statusCode}`);

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          callbacks.onRetryAttempt?.(retryCount);
          
          retryTimeout = setTimeout(() => {
            rejoinMeeting();
          }, RETRY_DELAY_MS);
        } else {
          callbacks.onMaxRetriesReached?.();
        }
      }
    },
  };

  // 1) Attach the observer
  audioVideo.addObserver(observer);

  // 2) Return the dedicated cleanup function
  return () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    audioVideo.removeObserver(observer);
  };
};
