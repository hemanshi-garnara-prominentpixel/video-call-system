import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  type AudioVideoObserver,
  type ContentShareObserver,
  type VideoTileState,
} from 'amazon-chime-sdk-js';


export interface TileInfo {
  tileId: number;
  attendeeId: string;
  isLocal: boolean;
  isContent: boolean;
  active: boolean;
}


interface UseChimeMeetingProps {
  meetingData: {
    meeting: any;
    attendee: any;
  } | null;
  onMeetingEnd?: () => void;
}

export function useChimeMeeting({ meetingData, onMeetingEnd }: UseChimeMeetingProps) {
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [remoteAttendeeIds, setRemoteAttendeeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── FIX 1: Track our attendee ID to detect override ──
  const localAttendeeIdRef = useRef<string | null>(null);

  // ── FIX 2: Ref stays in sync so toggleScreenShare never has stale closure ──
  const isScreenSharingRef = useRef(false);
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // Initialize and start the meeting session
  useEffect(() => {
    if (!meetingData) return;

    let cancelled = false;

    const startMeeting = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        const logger = new ConsoleLogger('ChimeMeeting', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);

        const configuration = new MeetingSessionConfiguration(
          meetingData.meeting,
          meetingData.attendee,
        );

        const meetingSession = new DefaultMeetingSession(
          configuration,
          logger,
          deviceController,
        );

        meetingSessionRef.current = meetingSession;

        // ── FIX 1: Store our attendee ID ──
        // Content share tiles use "{attendeeId}#content" as their boundAttendeeId
        localAttendeeIdRef.current =
          configuration.credentials?.attendeeId ?? null;

        // ── Audio/Video Observer ──────────────────────────────
        const observer: AudioVideoObserver = {
          audioVideoDidStart: () => {
            if (cancelled) return;
            console.log('[Chime] Meeting session started');
            setIsConnected(true);
            setIsConnecting(false);
          },

          audioVideoDidStop: async(sessionStatus) => {
            if (cancelled) return;

            try {
              await meetingSessionRef.current?.audioVideo.stopContentShare();
            } catch (e) {
              console.warn('Content share already stopped or session ended');
            }

            const code = sessionStatus.statusCode();
            console.log('[Chime] Meeting session stopped, status code:', code);
            setIsConnected(false);
            setIsScreenSharing(false);

            if (sessionStatus.isTerminal()) {
              onMeetingEnd?.();
            }
          },

          videoTileDidUpdate: (tileState: VideoTileState) => {
            if (cancelled) return;
            if (!tileState.boundAttendeeId) return;

            // ── FIX 1: Override detection ──
            // Content share attendee IDs end with "#content".
            // If a content tile arrives whose attendeeId does NOT match
            // ours, the agent started sharing. If we were sharing, stop.
            const isContentTile = !!tileState.isContent;
            if (isContentTile && tileState.active) {
              const localId = localAttendeeIdRef.current;
              const isOurContent =
                !!localId &&
                tileState.boundAttendeeId === `${localId}#content`;

              if (!isOurContent && isScreenSharingRef.current) {
                console.log('[Chime] Agent overrode our screen share');
                setIsScreenSharing(false);
                try {
                  meetingSession.audioVideo.stopContentShare();
                } catch {
                  // Already stopped
                }
              }
            }

            // Update tiles state (unchanged)
            setTiles((prev) => {
              const existing = prev.findIndex((t) => t.tileId === tileState.tileId);
              const tile: TileInfo = {
                tileId: tileState.tileId!,
                attendeeId: tileState.boundAttendeeId!,
                isLocal: !!tileState.localTile,
                isContent: !!tileState.isContent,
                active: !!tileState.active,
              };

              if (existing >= 0) {
                const next = [...prev];
                next[existing] = tile;
                return next;
              }
              return [...prev, tile];
            });
          },

          videoTileWasRemoved: (tileId: number) => {
            if (cancelled) return;
            setTiles((prev) => prev.filter((t) => t.tileId !== tileId));
          },
        };

        const contentObserver: ContentShareObserver = {
          contentShareDidStart: () => {
            if (cancelled) return;
            console.log('[Chime] Content share started');
            setIsScreenSharing(true);
          },
          contentShareDidStop: () => {
            if (cancelled) return;
            console.log('[Chime] Content share stopped');
            setIsScreenSharing(false);
            setTiles((prev) => prev.filter((t) => !(t.isContent && t.isLocal)));
          },
        };

        meetingSession.audioVideo.addObserver(observer);
        meetingSession.audioVideo.addContentShareObserver(contentObserver);

        // ── Real-time Presence Subscription ─────────────────
        meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(
          (attendeeId, present) => {
            if (cancelled) return;
            const localId = localAttendeeIdRef.current;
            // Ignore ourselves and content shares
            if (attendeeId === localId || attendeeId.endsWith('#content')) return;

            setRemoteAttendeeIds((prev) => {
              if (present) {
                if (prev.includes(attendeeId)) return prev;
                return [...prev, attendeeId];
              }
              return prev.filter((id) => id !== attendeeId);
            });
          }
        );

        // ── Select devices ──────────────────────────────────
        try {
          const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
          if (audioInputs.length > 0) {
            await meetingSession.audioVideo.startAudioInput(audioInputs[0].deviceId);
          }
        } catch (e) {
          console.warn('[Chime] Could not set audio input:', e);
        }

        try {
          const audioOutputs = await meetingSession.audioVideo.listAudioOutputDevices();
          if (audioOutputs.length > 0) {
            await meetingSession.audioVideo.chooseAudioOutput(audioOutputs[0].deviceId);
          }
        } catch (e) {
          console.warn('[Chime] Could not set audio output:', e);
        }

        try {
          const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();
          if (videoInputs.length > 0) {
            await meetingSession.audioVideo.startVideoInput(videoInputs[0].deviceId);
          }
        } catch (e) {
          console.warn('[Chime] Could not set video input (camera may be unavailable):', e);
        }

        // ── Start the session ────────────────────────────────
        meetingSession.audioVideo.start();
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Chime] Failed to start meeting:', err);
          setError(err.message || 'Failed to connect to meeting');
          setIsConnecting(false);
        }
      }
    };

    startMeeting();

    return () => {
      cancelled = true;
      const session = meetingSessionRef.current;
      if (session) {
        try {
          session.audioVideo.stopContentShare();
          session.audioVideo.stopLocalVideoTile();
          session.audioVideo.stop();
        } catch {
          // Ignore cleanup errors
        }
        meetingSessionRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setIsScreenSharing(false);
      setTiles([]);
      setRemoteAttendeeIds([]);
    };
  }, [meetingData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────

  const bindVideoElement = useCallback((tileId: number, element: HTMLVideoElement | null) => {
    const session = meetingSessionRef.current;
    if (!session || !element) return;
    session.audioVideo.bindVideoElement(tileId, element);
  }, []);

  const bindAudioElement = useCallback((element: HTMLAudioElement | null) => {
    const session = meetingSessionRef.current;
    if (!session || !element) return;
    session.audioVideo.bindAudioElement(element);
  }, []);

  const toggleMute = useCallback(() => {
    const session = meetingSessionRef.current;
    if (!session) return;

    if (isMuted) {
      session.audioVideo.realtimeUnmuteLocalAudio();
      setIsMuted(false);
    } else {
      session.audioVideo.realtimeMuteLocalAudio();
      setIsMuted(true);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    const session = meetingSessionRef.current;
    if (!session) return;

    if (isVideoOn) {
      session.audioVideo.stopLocalVideoTile();
      setIsVideoOn(false);
    } else {
      session.audioVideo.startLocalVideoTile();
      setIsVideoOn(true);
    }
  }, [isVideoOn]);

  // ── FIX 2: Uses ref instead of stale closure ──
  const toggleScreenShare = useCallback(async () => {
    const session = meetingSessionRef.current;
    if (!session) return;

    if (isScreenSharingRef.current) {
      try {
        await session.audioVideo.stopContentShare();
      } catch {
        // Already stopped
      }
      // Force reset in case observer doesn't fire
      setIsScreenSharing(false);
    } else {
      try {
        await session.audioVideo.startContentShareFromScreenCapture();
        // contentShareDidStart observer will set isScreenSharing = true
      } catch (err: any) {
        console.warn('[Chime] Screen share cancelled or denied:', err);
        setIsScreenSharing(false);
      }
    }
  }, []); // No dependency — reads from ref

  const leaveMeeting = useCallback(() => {
    const session = meetingSessionRef.current;
    if (session) {
      try {
        session.audioVideo.stopContentShare();
        session.audioVideo.stopLocalVideoTile();
        session.audioVideo.stop();
      } catch {
        // Ignore
      }
      meetingSessionRef.current = null;
    }
    setIsConnected(false);
    setIsScreenSharing(false);
    setTiles([]);
    onMeetingEnd?.();
  }, [onMeetingEnd]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isVideoOn,
    isScreenSharing,
    tiles,
    remoteAttendeeIds,
    error,
    bindVideoElement,
    bindAudioElement,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    leaveMeeting,
  };
}