'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from 'antd';

interface ModalConfig {
  title?: ReactNode;
  content: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  footer?: ReactNode;
  onOk?: () => void | Promise<void>;
}

interface ModalContextValue {
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
    setConfirmLoading(false);
  }, []);

  const openModal = useCallback((newConfig: ModalConfig) => {
    setConfig(newConfig);
    setOpen(true);
  }, []);

  const handleOk = useCallback(async () => {
    if (!config?.onOk) {
      closeModal();
      return;
    }
    try {
      setConfirmLoading(true);
      await config.onOk();
      closeModal();
    } catch {
      setConfirmLoading(false);
    }
  }, [config, closeModal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Modal
        open={open}
        title={config?.title}
        onOk={handleOk}
        onCancel={closeModal}
        okText={config?.okText}
        cancelText={config?.cancelText}
        confirmLoading={confirmLoading}
        footer={config?.footer}
        centered
      >
        {config?.content}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return ctx;
}


