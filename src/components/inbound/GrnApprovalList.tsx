'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchGrns, approveGrn, postGrn, rejectGrn, type Grn, type GrnStatus } from '@/services/grnService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<GrnStatus, { label: string; className: string }> = {
  DRAFT:            { label: 'Draft',        className: 'bg-gray-100 text-gray-600' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',   className: 'bg-orange-50 text-orange-700' },
  APPROVED:         { label: 'Đã duyệt',    className: 'bg-green-50 text-green-700' },
  REJECTED:         { label: 'Từ chối',     className: 'bg-red-50 text-red-700' },
  POSTED:           { label: 'Đã nhập kho', className: 'bg-blue-50 text-blue-700' },
};

export default function GrnApprovalList() {
  const [grns, setGrns] = useState<Grn[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selectedGrn, setSelectedGrn] = useState<Grn | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadGrns = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const data = await fetchGrns({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: p,
        size: 10,
      });
      setGrns(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPage(0);
    loadGrns(0);
  }, [statusFilter, loadGrns]);

  // PENDING_APPROVAL → APPROVED
  const handleApprove = async (grn: Grn) => {
    setActionLoading(true);
    try {
      await approveGrn(grn.grnId);
      toast.success(`Đã duyệt GRN ${grn.grnCode}`);
      setShowDetail(false);
      loadGrns(page);
    } finally {
      setActionLoading(false);
    }
  };

  // APPROVED → POSTED (cộng tồn kho + tạo Putaway Task)
  const handlePost = async (grn: Grn) => {
    setActionLoading(true);
    try {
      await postGrn(grn.grnId);
      toast.success(`Đã nhập kho GRN ${grn.grnCode} — Putaway Task đã được tạo`);
      setShowDetail(false);
      loadGrns(page);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedGrn) return;
    if (rejectReason.trim().length < 20) {
      toast.error('Lý do từ chối phải ít nhất 20 ký tự');
      return;
    }
    setActionLoading(true);
    try {
      await rejectGrn(selectedGrn.grnId, rejectReason.trim());
      toast.success(`Đã từ chối GRN ${selectedGrn.grnCode}`);
      setShowRejectModal(false);
      setShowDetail(false);
      setRejectReason('');
      loadGrns(page);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'Tất cả' :
             s === 'PENDING_APPROVAL' ? 'Chờ duyệt' :
             s === 'APPROVED' ? 'Đã duyệt' :
             s === 'REJECTED' ? 'Từ chối' : 'Đã nhập kho'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{totalElements} phiếu</span>
      </div>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mã GRN</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phiếu nhận</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ngày tạo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : grns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    Không có GRN nào
                  </td>
                </tr>
              ) : grns.map((grn) => (
                <tr key={grn.grnId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {grn.grnCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    #{grn.receivingId}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {grn.sourceType}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_BADGE[grn.status]?.className ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {STATUS_BADGE[grn.status]?.label ?? grn.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {new Date(grn.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedGrn(grn); setShowDetail(true); }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Trang {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); loadGrns(page - 1); }}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(p => p + 1); loadGrns(page + 1); }}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Detail */}
      {showDetail && selectedGrn && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Chi tiết GRN — {selectedGrn.grnCode}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phiếu nhận #{selectedGrn.receivingId} · {selectedGrn.sourceType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  STATUS_BADGE[selectedGrn.status]?.className
                }`}>
                  {STATUS_BADGE[selectedGrn.status]?.label}
                </span>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Ngày tạo</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {new Date(selectedGrn.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                {selectedGrn.sourceReferenceCode && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Số chứng từ</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {selectedGrn.sourceReferenceCode}
                    </p>
                  </div>
                )}
                {selectedGrn.note && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500">Ghi chú</p>
                    <p className="text-sm text-gray-700 mt-0.5">{selectedGrn.note}</p>
                  </div>
                )}
              </div>

              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Danh sách sản phẩm ({selectedGrn.items?.length ?? 0} dòng)
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">SKU</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Tên SP</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">Số lượng</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">Số lô</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">HSD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedGrn.items ?? []).map((item) => (
                      <tr key={item.grnItemId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-medium text-gray-900">
                          {item.skuCode}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{item.skuName}</td>
                        <td className="px-3 py-2 text-center font-bold text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {item.lotNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {item.expiryDate ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer: PENDING_APPROVAL → Approve/Reject; APPROVED → Post */}
            <div className="flex gap-2 px-5 py-4 border-t flex-shrink-0">
              {selectedGrn.status === 'PENDING_APPROVAL' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setShowRejectModal(true); setRejectReason(''); }}
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    isLoading={actionLoading}
                    onClick={() => handleApprove(selectedGrn)}
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Duyệt GRN
                  </Button>
                </>
              )}
              {selectedGrn.status === 'APPROVED' && (
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  isLoading={actionLoading}
                  onClick={() => handlePost(selectedGrn)}
                >
                  <span className="material-symbols-outlined text-sm">inventory</span>
                  Nhập kho (Post GRN)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Reject */}
      {showRejectModal && selectedGrn && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border overflow-hidden">
            <div className="bg-red-50 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-500">block</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Từ chối GRN</h3>
                <p className="text-xs text-gray-500">{selectedGrn.grnCode}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">
                  Lý do từ chối <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(tối thiểu 20 ký tự)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${rejectReason.length < 20 ? 'text-red-400' : 'text-green-600'}`}>
                    {rejectReason.length}/20 ký tự tối thiểu
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowRejectModal(false)}
              >
                Huỷ
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                isLoading={actionLoading}
                disabled={rejectReason.trim().length < 20}
                onClick={handleReject}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}