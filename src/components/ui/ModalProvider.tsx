'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/* ─────────────────────────────────────────────
   Generic modal (openModal) — giữ nguyên API cũ
───────────────────────────────────────────── */
interface ModalConfig {
  title?: ReactNode;
  content: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  footer?: ReactNode;
  onOk?: () => void | Promise<void>;
}

/* ─────────────────────────────────────────────
   Confirm dialog (useConfirm) — mới
───────────────────────────────────────────── */
export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmConfig {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: string;
  onConfirm: () => void | Promise<void>;
}

interface ModalContextValue {
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  confirm: (config: ConfirmConfig) => void;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

/* ── Confirm Dialog UI ── */
const VARIANT_STYLES: Record<ConfirmVariant, {
  iconBg: string; iconColor: string; confirmBtn: string; defaultIcon: string;
}> = {
  danger:  { iconBg: 'bg-red-50',     iconColor: 'text-red-600',     confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',          defaultIcon: 'delete_forever' },
  warning: { iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   confirmBtn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',    defaultIcon: 'warning' },
  info:    { iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500', defaultIcon: 'info' },
  success: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500', defaultIcon: 'check_circle' },
};

function ConfirmDialog({
  config, loading, onConfirm, onCancel,
}: {
  config: ConfirmConfig;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const variant = config.variant ?? 'info';
  const vs = VARIANT_STYLES[variant];
  const icon = config.icon ?? vs.defaultIcon;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(79,70,229,0.12)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ animation: 'confirmPop .18s cubic-bezier(.34,1.56,.64,1) both' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${vs.iconBg}`}>
            <span className={`material-symbols-outlined text-[22px] ${vs.iconColor}`}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{config.title}</h3>
            {config.description && (
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{config.description}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 pb-5 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {config.cancelText ?? 'Huỷ'}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-1 ${vs.confirmBtn}`}
          >
            {loading
              ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : <span className="material-symbols-outlined text-[16px]">{icon}</span>
            }
            {loading ? 'Đang xử lý...' : (config.confirmText ?? 'Xác nhận')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmPop {
          from { opacity:0; transform: scale(.92) translateY(8px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Provider ── */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [confirmRunning, setConfirmRunning] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
    setConfirmLoading(false);
  }, []);

  const openModal = useCallback((newConfig: ModalConfig) => {
    setConfig(newConfig);
    setOpen(true);
  }, []);

  const confirmFn = useCallback((cfg: ConfirmConfig) => {
    setConfirmConfig(cfg);
  }, []);

  const handleGenericOk = useCallback(async () => {
    if (!config?.onOk) { closeModal(); return; }
    try {
      setConfirmLoading(true);
      await config.onOk();
      closeModal();
    } catch {
      setConfirmLoading(false);
    }
  }, [config, closeModal]);

  const handleConfirmExecute = async () => {
    if (!confirmConfig) return;
    setConfirmRunning(true);
    try {
      await confirmConfig.onConfirm();
      setConfirmConfig(null);
    } catch {
      /* error toast handled by interceptor */
    } finally {
      setConfirmRunning(false);
    }
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, confirm: confirmFn }}>
      {children}

      {/* Generic modal */}
      {open && config && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{ background: 'rgba(79,70,229,0.12)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {config.title && (
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">{config.title}</h3>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            <div className="p-6">{config.content}</div>
            {config.footer !== null && (
              <div className="px-6 pb-5 flex justify-end gap-2.5">
                {config.footer ?? (
                  <>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={handleGenericOk}
                      disabled={confirmLoading}
                      className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 disabled:opacity-60 transition-all"
                    >
                      {confirmLoading && (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      )}
                      {String(config.okText ?? 'OK')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmConfig && (
        <ConfirmDialog
          config={confirmConfig}
          loading={confirmRunning}
          onConfirm={handleConfirmExecute}
          onCancel={() => { if (!confirmRunning) setConfirmConfig(null); }}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

export function useConfirm() {
  return useModal().confirm;
}