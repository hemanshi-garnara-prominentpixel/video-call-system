// import React from 'react';

// type ModalProps = {
//   isOpen: boolean;
//   type: 'info' | 'success' | 'warning' | 'error';
//   icon: React.ReactNode;
//   title: string;
//   msg: React.ReactNode;
//   actions: { label: string; style: 'primary' | 'secondary' | 'danger'; fn?: () => void }[];
//   onClose: () => void;
// };

// export function Modal({ isOpen, type, icon, title, msg, actions, onClose }: ModalProps) {
//   if (!isOpen) return null;

//   const typeConfig = {
//     info: { bar: 'bg-blue-500', iconBg: 'bg-blue-50', iconBorder: 'border-blue-200', text: 'text-blue-600' },
//     success: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-200', text: 'text-emerald-600' },
//     warning: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconBorder: 'border-amber-200', text: 'text-amber-600' },
//     error: { bar: 'bg-rose-500', iconBg: 'bg-rose-50', iconBorder: 'border-rose-200', text: 'text-rose-600' }
//   };

//   const c = typeConfig[type];

//   return (
//     <div 
//       className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
//     >
//       <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
//         <div className={`h-1.5 w-full ${c.bar}`} />
//         <div className="p-8 pb-6">
//           <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 border ${c.iconBg} ${c.iconBorder} ${c.text}`}>
//             {icon}
//           </div>
//           <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
//           <div className="text-sm text-slate-500 leading-relaxed mb-8">
//             {msg}
//           </div>
//           <div className="flex gap-3">
//             {actions.map((act, i) => (
//               <button
//                 key={i}
//                 onClick={() => { onClose(); if (act.fn) act.fn(); }}
//                 className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
//                   act.style === 'primary' 
//                     ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' 
//                   : act.style === 'danger'
//                     ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
//                   : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
//                 }`}
//               >
//                 {act.label}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalVariant = 'blue' | 'red' | 'amber' | 'green' | 'none';
type ModalType    = 'info' | 'success' | 'warning' | 'error';

export interface StatusModalAction {
  label: string;
  /** 'primary' = blue filled | 'secondary' = ghost | 'danger' = rose ghost */
  style: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  /** Legacy alias — same as onClick */
  fn?: () => void;
  icon?: React.ReactNode;
}

export interface StatusModalProps {
  isOpen?: boolean;

  // ── Variant / colour ──────────────────────────────────────────────────────
  /**
   * Pass either `variant` (explicit colour name) OR `type` (semantic alias).
   * `type` maps → info→blue, success→green, warning→amber, error→red.
   * `variant` wins if both are supplied.
   */
  variant?: ModalVariant;
  type?: ModalType;

  // ── Content ───────────────────────────────────────────────────────────────
  icon: React.ReactNode;
  /** Small ALL-CAPS badge rendered above the title (optional) */
  badge?: string;
  title: string;
  /** Alias for description — accepts ReactNode so you can pass JSX */
  msg?: React.ReactNode;
  description?: React.ReactNode;
  /** Slot for extra content below description (e.g. time-info boxes) */
  children?: React.ReactNode;

  // ── Actions ───────────────────────────────────────────────────────────────
  actions?: StatusModalAction[];

  // ── Layout ────────────────────────────────────────────────────────────────
  /** Wrap card in a fullscreen backdrop overlay (default: true) */
  overlay?: boolean;

  onClose?: () => void;
}

// ─── Colour map ──────────────────────────────────────────────────────────────

const TYPE_TO_VARIANT: Record<ModalType, ModalVariant> = {
  info:    'blue',
  success: 'green',
  warning: 'amber',
  error:   'red',
};

const VARIANT_STYLES: Record<ModalVariant, {
  bar:         string;
  iconBg:      string;
  iconBorder:  string;
  iconText:    string;
  badgeBg:     string;
  badgeBorder: string;
  badgeText:   string;
  topGrad:     string;
}> = {
  blue: {
    bar:         'bg-blue-500',
    iconBg:      'bg-blue-50',
    iconBorder:  'border-blue-200',
    iconText:    'text-blue-500',
    badgeBg:     'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText:   'text-blue-600',
    topGrad:     'from-blue-50/80',
  },
  red: {
    bar:         'bg-rose-500',
    iconBg:      'bg-rose-50',
    iconBorder:  'border-rose-200',
    iconText:    'text-rose-500',
    badgeBg:     'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText:   'text-rose-600',
    topGrad:     'from-rose-50/80',
  },
  amber: {
    bar:         'bg-amber-400',
    iconBg:      'bg-amber-50',
    iconBorder:  'border-amber-200',
    iconText:    'text-amber-500',
    badgeBg:     'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText:   'text-amber-600',
    topGrad:     'from-amber-50/80',
  },
  green: {
    bar:         'bg-emerald-500',
    iconBg:      'bg-emerald-50',
    iconBorder:  'border-emerald-200',
    iconText:    'text-emerald-500',
    badgeBg:     'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText:   'text-emerald-600',
    topGrad:     'from-emerald-50/80',
  },
  none: {
    bar:         '',
    iconBg:      'bg-slate-50',
    iconBorder:  'border-slate-200',
    iconText:    'text-slate-500',
    badgeBg:     'bg-slate-50',
    badgeBorder: 'border-slate-200',
    badgeText:   'text-slate-600',
    topGrad:     'from-slate-50/80',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  isOpen = true,
  variant,
  type,
  icon,
  badge,
  title,
  msg,
  description,
  children,
  actions = [],
  overlay = true,
  onClose,
}: StatusModalProps) {
  if (!isOpen) return null;

  // Resolve colour
  const resolvedVariant: ModalVariant =
    variant ?? (type ? TYPE_TO_VARIANT[type] : 'none');
  const s = VARIANT_STYLES[resolvedVariant];

  // Description accepts either prop name
  const body = description ?? msg;

  const card = (
    <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200 relative">

      {/* Accent bar */}
      {resolvedVariant !== 'none' && (
        <div className={`h-1.5 w-full ${s.bar}`} />
      )}

      {/* Top gradient wash */}
      <div
        className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${s.topGrad} to-transparent pointer-events-none`}
      />

      <div className="relative p-8 sm:p-10 flex flex-col items-center text-center">

        {/* Icon box */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border shadow-inner ${s.iconBg} ${s.iconBorder} ${s.iconText}`}
        >
          {icon}
        </div>

        {/* Badge */}
        {badge && (
          <div
            className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-md border text-[11px] font-black tracking-widest uppercase mb-4 shadow-sm ${s.badgeBg} ${s.badgeBorder} ${s.badgeText}`}
          >
            {badge}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>

        {/* Body */}
        {body && (
          <div className="text-[13px] font-medium text-slate-500 mb-6 px-2 leading-relaxed">
            {body}
          </div>
        )}

        {/* Extra slot (time boxes, info panels, etc.) */}
        {children && (
          <div className="w-full mb-6 space-y-3">{children}</div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="w-full flex flex-col gap-3">
            {actions.map((action, i) => {
              const handler = () => {
                onClose?.();
                action.onClick?.();
                action.fn?.();
              };
              return (
                <button
                  key={i}
                  onClick={handler}
                  className={[
                    'w-full py-4 px-6 rounded-xl text-[15px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2',
                    action.style === 'primary'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : action.style === 'danger'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200',
                  ].join(' ')}
                >
                  {action.icon}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        {card}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {card}
    </div>
  );
}