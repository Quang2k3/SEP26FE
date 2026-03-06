"use client";

import { useEffect, useState } from "react";
import { createIncident } from "@/services/incidentService";
import { Button } from "antd";

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

  useEffect(() => {
    if (open) {
      setStep("check");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const handleIncident = async () => {
    try {
      setLoading(true);

      await createIncident({
        warehouseId,
        incidentType: "SEAL_BROKEN",
        description,
        receivingId,
      });

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white p-6 rounded-lg w-[420px] shadow-lg">
        {step === "check" && (
          <>
            <h3 className="text-lg font-semibold mb-4">
              Seal xe có nguyên vẹn không?
            </h3>

            <div className="flex gap-3">
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded cursor-pointer"
                onClick={() => {
                  onClose();
                  // TODO: navigate scan screen
                }}
              >
                Có - OK
              </button>

              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded cursor-pointer"
                onClick={() => setStep("incident")}
              >
                Báo cáo sự cố
              </button>
            </div>
          </>
        )}

        {step === "incident" && (
          <>
            <h3 className="text-lg font-semibold mb-4">
              Tạo Incident
            </h3>

            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder="Nhập mô tả ngắn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Button
              disabled={loading}
              onClick={handleIncident}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              {loading ? "Đang gửi..." : "Gửi Quản lý"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}