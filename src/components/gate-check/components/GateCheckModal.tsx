"use client";

import { useEffect, useState } from "react";
import { Modal } from "antd";
import ScanQRCode from "@/components/inbound/ScanQRCode";

export default function GateCheckModal({
  open,
  onClose,
  receivingId,
}: {
  open: boolean;
  onClose: () => void;
  receivingId: number;
  warehouseId: number;
}) {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      title={
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">qr_code_scanner</span>
          <span>Scan hàng — Phiếu #{receivingId}</span>
        </div>
      }
    >
      <ScanQRCode receivingId={receivingId} />
    </Modal>
  );
}