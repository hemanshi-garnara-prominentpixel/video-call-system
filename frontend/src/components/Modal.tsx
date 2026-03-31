import React from 'react';

type ModalProps = {
  isOpen: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  msg: React.ReactNode;
  actions: { label: string; style: 'primary' | 'secondary' | 'danger'; fn?: () => void }[];
  onClose: () => void;
};

export function Modal({ isOpen, type, icon, title, msg, actions, onClose }: ModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    info: { bar: 'bg-blue-500', iconBg: 'bg-blue-50', iconBorder: 'border-blue-200', text: 'text-blue-600' },
    success: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-200', text: 'text-emerald-600' },
    warning: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconBorder: 'border-amber-200', text: 'text-amber-600' },
    error: { bar: 'bg-rose-500', iconBg: 'bg-rose-50', iconBorder: 'border-rose-200', text: 'text-rose-600' }
  };

  const c = typeConfig[type];

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`h-1.5 w-full ${c.bar}`} />
        <div className="p-8 pb-6">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 border ${c.iconBg} ${c.iconBorder} ${c.text}`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <div className="text-sm text-slate-500 leading-relaxed mb-8">
            {msg}
          </div>
          <div className="flex gap-3">
            {actions.map((act, i) => (
              <button
                key={i}
                onClick={() => { onClose(); if (act.fn) act.fn(); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  act.style === 'primary' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' 
                  : act.style === 'danger'
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
