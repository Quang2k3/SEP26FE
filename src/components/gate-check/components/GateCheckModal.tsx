"use client";

import { useEffect, useState } from "react";
import { createIncident } from "@/services/incidentService";
import { Modal, Button, Input, Space } from "antd";
import toast from "react-hot-toast";
import ScanQRCode from "@/components/inbound/ScanQRCode";
import { useModal } from "@/components/ui/ModalProvider";

const { TextArea } = Input;

export default function GateCheckModal({
  open,
  onClose,
  receivingId,
  warehouseId,
}: {
  open: boolean;
  onClose: () => void;
  receivingId: number;
  warehouseId: number;
}) {
  const [step, setStep] = useState<"check" | "incident">("check");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { openModal } = useModal();

  useEffect(() => {
    if (open) {
      setStep("check");
      setDescription("");
    }
  }, [open]);

  const handleIncident = async () => {
    try {
      setLoading(true);

      await createIncident({
        warehouseId,
        incidentType: "SEAL_BROKEN", // chưa biết truyền gì ( post xong trạng thái không update)
        description,
        receivingId,
      });
      toast.success("Gửi thành công!");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={step === "check" ? "Seal xe có nguyên vẹn không?" : "Tạo Incident"}
    >
      {step === "check" && (
        <Space direction="vertical" className="w-full">
          <Button
            type="primary"
            block
            onClick={() => {
              onClose();
              openModal({
                title: "Nhập hàng vào kho",
                content: (
                  <div className="p-4">
                    <ScanQRCode />
                  </div>
                ),
                footer: null,
              });
            }}
          >
            Có - OK
          </Button>

          <Button danger block onClick={() => setStep("incident")}>
            Báo cáo sự cố
          </Button>
        </Space>
      )}

      {step === "incident" && (
        <Space direction="vertical" className="w-full">
          <TextArea
            rows={4}
            placeholder="Nhập mô tả ngắn..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button
            type="primary"
            loading={loading}
            onClick={handleIncident}
            block
          >
            Gửi Quản lý
          </Button>
        </Space>
      )}
    </Modal>
  );
}
