'use client';

/**
 * /outbound/[id] — Standalone detail page cho một lệnh xuất kho.
 *
 * Dùng khi cần share link trực tiếp hoặc navigate từ notification.
 * Các action (submit, approve, allocate, pick, qc, dispatch) đều
 * được handle ngay trên trang này thông qua OutboundDetailModal.
 */

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchOutboundOrders } from '@/services/outboundService';
import type { OutboundListItem } from '@/interfaces/outbound';
import OutboundDetailModal from '@/components/outbound/components/OutboundDetailModal';

export default function OutboundDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OutboundListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // Fetch bằng keyword = documentCode để lấy item
    fetchOutboundOrders({ keyword: id, size: 1 })
      .then((res) => {
        const found = res.content.find(
          (o) => String(o.documentId) === id || o.documentCode === id,
        );
        setItem(found ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-400">Đang tải lệnh xuất...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Không tìm thấy lệnh xuất: {id}</p>
          <button
            onClick={() => router.push('/outbound')}
            className="mt-3 text-sm text-indigo-600 hover:underline"
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <OutboundDetailModal
      item={item}
      onClose={() => router.push('/outbound')}
      onRefresh={() => router.refresh()}
    />
  );
}
