"use client";

import { Modal, Button } from "antd";

interface Props {
  open: boolean;
  onOk: () => void;
  onReport: () => void;
  onCancel: () => void;
}

export default function GateCheckModal({
  open,
  onOk,
  onReport,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      footer={null}
      onCancel={onCancel}
      centered
    >
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-lg font-semibold">
          Seal xe có nguyên vẹn không?
        </h2>

        <div className="flex justify-center gap-3">
          <Button type="primary" onClick={onOk}>
            Có - OK
          </Button>

          <Button danger onClick={onReport}>
            Không - Báo cáo sự cố
          </Button>
        </div>
      </div>
    </Modal>
  );
}