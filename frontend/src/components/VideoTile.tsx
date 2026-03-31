// import { useEffect, useRef } from 'react';
// import { User } from 'lucide-react';

// interface VideoTileProps {
//   tileId: number;
//   isLocal: boolean;
//   isContent: boolean;
//   active: boolean;
//   label?: string;
//   bindVideoElement: (tileId: number, el: HTMLVideoElement | null) => void;
//   className?: string;
// }

// export function VideoTile({
//   tileId,
//   isLocal,
//   isContent,
//   active,
//   label,
//   bindVideoElement,
//   className = '',
// }: VideoTileProps) {
//   const videoRef = useRef<HTMLVideoElement>(null);

//   useEffect(() => {
//     if (videoRef.current) {
//       bindVideoElement(tileId, videoRef.current);
//     }
//   }, [tileId, bindVideoElement]);

//   return (
//     <div
//       className={`relative bg-slate-900 rounded-2xl overflow-hidden ${className}`}
//     >
//       <video
//         ref={videoRef}
//         autoPlay
//         style={{ transform: isLocal && !isContent ? 'scaleX(-1)' : 'none' }}
//         playsInline
//         muted={isLocal}
//         className={`w-full h-full ${
//     isContent ? 'object-contain' : 'object-cover'
//   } ${isLocal && !isContent ? 'scale-x-[-1]' : ''}`}
//       />

//       {/* Placeholder when video is inactive */}
//       {!active && (
//         <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
//           <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
//             <User size={28} className="text-slate-400" />
//           </div>
//         </div>
//       )}

//       {/* Label badge */}
//       {label && (
//         <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
//           <span className="text-xs font-semibold text-white">
//   {isContent ? (isLocal ? 'Your Screen' : 'Agent Screen') : label}
// </span>
//         </div>
//       )}

//       {/* Local indicator */}
//       {isLocal && !isContent && (
//         <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-blue-500/80 backdrop-blur-sm">
//           <span className="text-[10px] font-bold text-white uppercase tracking-wide">You</span>
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useRef } from 'react';
import { Monitor } from 'lucide-react';

interface VideoTileProps {
  tileId: number;
  isLocal: boolean;
  isContent: boolean;
  active: boolean;
  label?: string;
  bindVideoElement: (tileId: number, el: HTMLVideoElement | null) => void;
  className?: string;
  isMini?: boolean;
}

/** Extract up to two initials from a display name */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Deterministic pastel background from a string */
function avatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-500',
    'from-fuchsia-500 to-purple-500',
    'from-lime-500 to-green-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function VideoTile({
  tileId,
  isLocal,
  isContent,
  active,
  label,
  bindVideoElement,
  className = '',
  isMini = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      bindVideoElement(tileId, videoRef.current);
    }
  }, [tileId, bindVideoElement]);

  const initials = label ? getInitials(label) : '?';
  const gradient = label ? avatarColor(label) : 'from-slate-500 to-slate-600';

  return (
    <div className={`group relative overflow-hidden ${isContent ? 'rounded-2xl' : 'rounded-2xl'} ${className}`}
      style={{ background: '#0f172a' }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          active ? 'opacity-100' : 'opacity-0'
        } ${isLocal && !isContent ? 'scale-x-[-1]' : ''}`}
      />

      {/* Avatar placeholder when video is off */}
      {!active && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}
        >
          {isContent ? (
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Monitor size={28} className="text-slate-400" />
            </div>
          ) : (
            <>
              <div className={`${isMini ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-xl'} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-lg`}>
                {initials}
              </div>
              {!isMini && label && (
                <span className="text-sm font-medium text-slate-400">{label}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Bottom gradient overlay for label readability */}
      {active && label && (
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      )}

      {/* Label badge */}
      {label && (
        <div className={`absolute left-3 flex items-center gap-1.5 transition-opacity ${
          active ? 'bottom-3' : 'bottom-3'
        }`}>
          {isContent && (
            <div className="w-5 h-5 rounded bg-blue-500/90 flex items-center justify-center">
              <Monitor size={11} className="text-white" />
            </div>
          )}
          <span className={`${isMini ? 'text-[10px]' : 'text-xs'} font-semibold text-white drop-shadow-md`}>
            {isContent ? (label) : label}
          </span>
        </div>
      )}

      {/* "You" badge for local tile */}
      {isLocal && !isContent && (
        <div className="absolute top-3 right-3">
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-blue-500/80 backdrop-blur-sm">
//           <span className="text-[10px] font-bold text-white uppercase tracking-wide">You</span>
//         </div>
        </div>
      )}

      {/* Subtle inner border for depth */}
      <div className="absolute inset-0 rounded-2xl border border-white/[0.06] pointer-events-none" />
    </div>
  );
}