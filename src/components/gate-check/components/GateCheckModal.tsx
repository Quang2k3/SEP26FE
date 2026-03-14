"use client";

import { Modal } from "antd";
import ScanQRCode from "@/components/inbound/ScanQRCode";

interface Props {
  open: boolean;
  onClose: () => void;
  receivingId: number;
  warehouseId: number;
  userRole?: string;
}

export default function GateCheckModal({ open, onClose, receivingId, userRole = 'KEEPER' }: Props) {
  if (!open) return null;

  const isQC = userRole === 'QC';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      title={
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">
            {isQC ? 'verified' : 'qr_code_scanner'}
          </span>
          <span>
            {isQC ? 'QC Kiểm tra — Phiếu' : 'Scan hàng — Phiếu'} #{receivingId}
          </span>
        </div>
      }
    >
      <ScanQRCode
        receivingId={receivingId}
        userRole={userRole}
        onDone={onClose}
      />
    </Modal>
  );
}
