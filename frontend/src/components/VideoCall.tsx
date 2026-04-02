import { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorOff,
  MonitorUp,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { useChimeMeeting } from '../hooks/useChimeMeeting';
import { VideoTile } from './VideoTile';

interface VideoCallProps {
  meetingData: {
    meeting: any;
    attendee: any;
  };
  displayName: string;
  onLeave: (reason?: 'CleanExit' | 'NetworkError' | 'AgentNetworkError' | 'CustomerNetworkError') => void;
}

export function VideoCall({ meetingData, displayName, onLeave }: VideoCallProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    isConnected,
    isConnecting,
    isMuted,
    isVideoOn,
    isScreenSharing,
    isNetworkPoor,
    agentNetworkPoor,
    hasJoined,
    tiles,
    remoteAttendeeIds,
    error,
    bindVideoElement,
    bindAudioElement,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    leaveMeeting,
  } = useChimeMeeting({
    meetingData,
    onMeetingEnd: onLeave,
  });

  // Bind audio element once connected
  useEffect(() => {
    if (isConnected && audioRef.current) {
      bindAudioElement(audioRef.current);
      audioRef.current.play().catch((err) => console.warn('[VideoCall] Auto-play prevented or re-bind ignored:', err));
    }
  }, [isConnected, bindAudioElement]);

  // Kickstart audio element if agent recovers from network failure
  const wasAgentNetworkPoor = useRef(agentNetworkPoor);
  useEffect(() => {
    if (wasAgentNetworkPoor.current && !agentNetworkPoor) {
      audioRef.current?.play().catch(e => console.warn('[VideoCall] Audio kick failed:', e));
    }
    wasAgentNetworkPoor.current = agentNetworkPoor;
  }, [agentNetworkPoor]);

  // Separate tiles by type
  const localTile = tiles.find((t) => t.isLocal && !t.isContent);
  const remoteTile = tiles.find((t) => !t.isLocal && !t.isContent);
  const isAgentJoined = remoteAttendeeIds.length > 0;

  const contentTiles = tiles.filter((t) => t.isContent);
  const activeContentTile = contentTiles.length > 0 ? contentTiles[contentTiles.length - 1] : null;
  const hasContentShare = activeContentTile !== null;

  if (isConnecting || (!hasJoined && !isConnected)) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 size={40} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">
            {error ? 'Connection failed' : 'Connecting to meeting...'}
          </p>
          {error && (
            <div className="mt-4 max-w-sm mx-auto px-4">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => onLeave()}
                className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden">
      {/* Hidden audio element for remote audio */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* ── Main Content Area ────────────────────────────── */}
      <div className="flex-1 relative p-3 sm:p-4 overflow-hidden">
        {/* ── Network Poor / Hold Screen ───────────────────────── */}
        {isNetworkPoor ? (
          <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div className="bg-slate-800 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 flex flex-col items-center text-center w-full max-w-[280px] sm:max-w-sm shadow-2xl">
              <WifiOff className="w-10 h-10 sm:w-16 sm:h-16 text-amber-500 mb-3 sm:mb-6 animate-pulse shrink-0" />
              <h2 className="text-base sm:text-2xl font-bold text-white mb-2 sm:mb-3">Poor Connection</h2>
              <p className="text-slate-300 text-xs sm:text-[15px] leading-relaxed mb-5 sm:mb-6">
                Please hold on while we try to restore your connection. Your video and audio have been temporarily disabled.
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-500/80 bg-amber-500/10 px-3 sm:px-4 py-2 rounded-full w-full sm:w-auto">
                <Loader2 size={14} className="animate-spin shrink-0 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-sm font-semibold tracking-wide uppercase">Reconnecting...</span>
              </div>
            </div>
          </div>
        ) : hasContentShare ? (
          /* ── Screen Share Layout (70/30 Split) ─── */
          <div className="h-full flex flex-col lg:flex-row gap-4">
            {/* Left: Screen Share (70%) */}
            <div className="flex-1 lg:flex-[0.7] min-h-0">
              <VideoTile
                key={activeContentTile.tileId}
                tileId={activeContentTile.tileId}
                isLocal={activeContentTile.isLocal}
                isContent={true}
                active={activeContentTile.active}
                label={
                  activeContentTile.isLocal
                    ? 'Your Screen'
                    : isAgentJoined
                    ? 'Agent Screen'
                    : 'Shared Screen'
                }
                bindVideoElement={bindVideoElement}
                className="w-full h-full border border-white/10"
              />
            </div>

            {/* Right: Sidebar (30%) — always render both participant tiles */}
            <div className="flex lg:flex-[0.3] gap-3 lg:flex-col overflow-x-auto lg:overflow-y-auto justify-center">
              {/* Agent tile in sidebar */}
              {isAgentJoined ? (
                <div className="relative w-36 h-24 lg:w-full lg:h-auto lg:aspect-video flex-shrink-0">
                  <VideoTile
                    key="agent-sidebar"
                    tileId={remoteTile?.tileId ?? -1}
                    isLocal={false}
                    isContent={false}
                    active={!!remoteTile && remoteTile.active}
                    label="Agent"
                    bindVideoElement={bindVideoElement}
                    className="w-full h-full"
                  />
                  {agentNetworkPoor && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 rounded-2xl z-10 text-center">
                      <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 mb-1 sm:mb-2 animate-pulse" />
                      <p className="text-[10px] sm:text-xs text-white font-medium leading-tight">Agent connection lost</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-36 h-24 lg:w-full lg:aspect-video flex-shrink-0 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center">
                  <p className="text-slate-500 text-[10px] font-medium text-center px-2">
                    Waiting for Agent...
                  </p>
                </div>
              )}

              {/* Customer tile in sidebar — always render once connected */}
              <VideoTile
                key="local-sidebar"
                tileId={localTile?.tileId ?? -1}
                isLocal={true}
                isContent={false}
                active={isVideoOn}
                isMini={false}
                label={displayName}
                bindVideoElement={bindVideoElement}
                className="w-36 h-24 lg:w-full lg:h-auto lg:aspect-video flex-shrink-0"
              />
            </div>
          </div>
        ) : (
          /* ── Video-Only Layout ────────────────── */
          <div className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-950">

            {/* Primary View — Agent (fills the whole area) */}
            <div className="absolute inset-0">
              {isAgentJoined ? (
                <div className="relative w-full h-full">
                  <VideoTile
                    key="agent-main"
                    tileId={remoteTile?.tileId ?? -1}
                    isLocal={false}
                    isContent={false}
                    active={!!remoteTile && remoteTile.active}
                    label="Agent"
                    bindVideoElement={bindVideoElement}
                    className="w-full h-full"
                  />
                  {agentNetworkPoor && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center p-4">
                      <WifiOff className="w-10 h-10 sm:w-16 sm:h-16 text-amber-500 mb-3 sm:mb-4 animate-pulse" />
                      <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">Agent Network Issue</h2>
                      <p className="text-slate-300 text-xs sm:text-sm max-w-xs sm:max-w-sm leading-relaxed">
                        The agent is facing a network issue. Please wait while they reconnect...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Agent truly hasn't joined yet — no presence detected */
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-2xl shadow-inner">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Loader2 size={24} className="text-slate-500 animate-spin" />
                  </div>
                  <p className="text-slate-400 font-medium tracking-wide text-sm">
                    Waiting for Agent to join...
                  </p>
                </div>
              )}
            </div>

            {/* Floating Customer PiP tile (top-right corner) — always render once connected */}
            <div className="absolute top-4 right-4 w-32 h-20 sm:w-44 sm:h-28 lg:w-56 lg:h-36 z-20 transition-all duration-500">
              <VideoTile
                key="local-pip"
                tileId={localTile?.tileId ?? -1}
                isLocal={true}
                isContent={false}
                active={isVideoOn}
                isMini={true}
                label={displayName}
                bindVideoElement={bindVideoElement}
                className="w-full h-full shadow-2xl shadow-black/50 ring-1 ring-white/10"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Controls Bar ────────────────────────────────── */}
      <div className="flex-shrink-0 pb-6 pt-2 px-4 bg-slate-900">
        <div className="flex items-center justify-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={`group w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isMuted
                ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 hover:bg-rose-500/20'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`group w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              !isVideoOn
                ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 hover:bg-rose-500/20'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen share toggle */}
          <button
            onClick={toggleScreenShare}
            className={`group w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isScreenSharing
                ? 'bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20 hover:bg-sky-500/20'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          </button>

          {/* Leave call */}
          <button
            onClick={leaveMeeting}
            className="w-14 h-12 sm:w-16 sm:h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all shadow-xl shadow-rose-600/30 ring-1 ring-rose-400/20"
            title="Leave call"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}