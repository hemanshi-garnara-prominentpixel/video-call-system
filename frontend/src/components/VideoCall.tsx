import { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Loader2,
} from 'lucide-react';
import { useChimeMeeting } from '../hooks/useChimeMeeting';
import { VideoTile } from './VideoTile';

interface VideoCallProps {
  meetingData: {
    meeting: any;
    attendee: any;
  };
  displayName: string;
  onLeave: () => void;
}

export function VideoCall({ meetingData, displayName, onLeave }: VideoCallProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    isConnected,
    isConnecting,
    isMuted,
    isVideoOn,
    isScreenSharing,
    tiles,
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
    }
  }, [isConnected, bindAudioElement]);

  // Separate tiles by type
  const localTile = tiles.find((t) => t.isLocal && !t.isContent);
  // Only show the most recent (last) content tile — handles override scenario
  const contentTiles = tiles.filter((t) => t.isContent);
  const activeContentTile = contentTiles.length > 0 ? contentTiles[contentTiles.length - 1] : null;
  const remoteTiles = tiles.filter((t) => !t.isLocal && !t.isContent);

  // Determine layout: if screen share is active, use presenter layout
  const hasContentShare = activeContentTile !== null;

  if (isConnecting || !isConnected) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 size={40} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">
            {error ? 'Connection failed' : 'Connecting to meeting...'}
          </p>
          {error && (
            <div className="mt-4 max-w-sm">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={onLeave}
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
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50">
      {/* Hidden audio element for remote audio */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* ── Video Grid ──────────────────────────────────── */}
      <div className="flex-1 p-3 sm:p-4 overflow-hidden">
        {hasContentShare ? (
          /* ── Presenter Layout (screen share active) ─── */
          <div className="h-full flex flex-col lg:flex-row gap-3">
            {/* Main content share */}
            <div className="flex-1 min-h-0">
              {activeContentTile && (
                <VideoTile
                  key={activeContentTile.tileId}
                  tileId={activeContentTile.tileId}
                  isLocal={activeContentTile.isLocal}
                  isContent={activeContentTile.isContent}
                  active={activeContentTile.active}
                  label={activeContentTile.isLocal ? 'Your Screen' : 'Agent Screen'}
                  bindVideoElement={bindVideoElement}
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Sidebar with participants */}
            <div className="flex lg:flex-col gap-2 lg:w-52 overflow-x-auto lg:overflow-y-auto">
              {localTile && (
                <VideoTile
                  key={localTile.tileId}
                  tileId={localTile.tileId}
                  isLocal={true}
                  isContent={false}
                  active={localTile.active}
                  label={displayName}
                  bindVideoElement={bindVideoElement}
                  className="w-36 h-28 lg:w-full lg:h-36 flex-shrink-0"
                />
              )}
              {remoteTiles.map((tile) => (
                <VideoTile
                  key={tile.tileId}
                  tileId={tile.tileId}
                  isLocal={false}
                  isContent={false}
                  active={tile.active}
                  label="Participant"
                  bindVideoElement={bindVideoElement}
                  className="w-36 h-28 lg:w-full lg:h-36 flex-shrink-0"
                />
              ))}
            </div>
          </div>
        ) : (
          /* ── Grid Layout (no screen share) ────────── */
          <div className={`h-full grid gap-3 ${getGridClass(remoteTiles.length + (localTile ? 1 : 0))}`}>
            {localTile && (
              <VideoTile
                key={localTile.tileId}
                tileId={localTile.tileId}
                isLocal={true}
                isContent={false}
                active={localTile.active}
                label={displayName}
                bindVideoElement={bindVideoElement}
                className="w-full h-full"
              />
            )}
            {remoteTiles.map((tile) => (
              <VideoTile
                key={tile.tileId}
                tileId={tile.tileId}
                isLocal={false}
                isContent={false}
                active={tile.active}
                label="Participant"
                bindVideoElement={bindVideoElement}
                className="w-full h-full"
              />
            ))}

            {/* Empty state when alone */}
            {remoteTiles.length === 0 && !localTile && (
              <div className="flex items-center justify-center text-slate-500 col-span-full">
                <p className="text-sm font-medium">Waiting for Agent to join...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Controls Bar ────────────────────────────────── */}
      <div className="flex-shrink-0 pb-6 pt-2 px-4">
        <div className="flex items-center justify-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all ${
              !isVideoOn
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen share toggle */}
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          </button>

          {/* Leave call */}
          <button
            onClick={leaveMeeting}
            className="w-14 h-12 sm:w-16 sm:h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
            title="Leave call"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns a Tailwind grid class based on participant count */
function getGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
  if (count <= 9) return 'grid-cols-3';
  return 'grid-cols-3 lg:grid-cols-4';
}