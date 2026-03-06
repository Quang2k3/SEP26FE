"use client";

import { Modal, Input, Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";

interface Props {
  open: boolean;
  onSubmit: (description: string, file?: File) => void;
  onCancel: () => void;
}

export default function CreateIncidentModal({
  open,
  onSubmit,
  onCancel,
}: Props) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File>();

  return (
    <Modal
      title="Báo cáo sự cố"
      open={open}
      onCancel={onCancel}
      footer={null}
    >
      <div className="flex flex-col gap-4">
        <Upload
          beforeUpload={(f) => {
            setFile(f);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>
            Upload hình ảnh seal
          </Button>
        </Upload>

        <Input.TextArea
          placeholder="Mô tả sự cố..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Button
          type="primary"
          onClick={() => onSubmit(description, file)}
        >
          Gửi Quản lý
        </Button>
      </div>
    </Modal>
  );
}