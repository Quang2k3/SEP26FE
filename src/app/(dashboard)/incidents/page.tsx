'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { DataTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';
import {
  fetchIncidents,
  createIncident,
} from '@/services/incidentService';
import type { Incident, IncidentStatus } from '@/interfaces/incident';
import type { Column } from '@/components/ui/Table';

// ─── helpers ─────────────────────────────────────────────────────────────────
function getWarehouseId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const s = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
    return s?.warehouseId ?? s?.warehouseIds?.[0] ?? 0;
  } catch { return 0; }
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  OPEN:     { label: 'Chờ xử lý', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  APPROVED: { label: 'Đã duyệt',  className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  REJECTED: { label: 'Từ chối',   className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  RESOLVED: { label: 'Đã xử lý', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
};

const INCIDENT_TYPES = [
  { value: 'SEAL_BROKEN',      label: 'Seal bị đứt / rách' },
  { value: 'SEAL_MISMATCH',    label: 'Số seal không khớp' },
  { value: 'PACKAGING_DAMAGE', label: 'Hỏng bao bì container' },
  { value: 'DAMAGE',           label: 'Hàng hỏng / móp' },
  { value: 'SHORTAGE',         label: 'Thiếu hàng' },
  { value: 'OVERAGE',          label: 'Thừa hàng' },
  { value: 'OTHER',            label: 'Sự cố khác' },
];

const CATEGORIES = [
  { value: 'GATE',    label: 'Gate Check (Seal/Container)' },
  { value: 'QUALITY', label: 'Chất lượng hàng hóa' },
];

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateIncidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [category, setCategory] = useState('GATE');
  const [incidentType, setIncidentType] = useState('SEAL_BROKEN');
  const [description, setDescription] = useState('');
  const [receivingId, setReceivingId] = useState('');
  const [loading, setLoading] = useState(false);

  const warehouseId = getWarehouseId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Vui lòng nhập mô tả sự cố.'); return; }
    try {
      setLoading(true);
      await createIncident({
        warehouseId,
        category: category as any,
        incidentType,
        description: description.trim(),
        receivingId: receivingId ? parseInt(receivingId) : undefined as any,
      });
      toast.success('Tạo báo cáo sự cố thành công!');
      onCreated();
      onClose();
    } catch {
      // interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Báo cáo sự cố</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ghi nhận sự cố trong quá trình nhập/xuất kho</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form id="incident-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Loại sự cố <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setCategory(c.value);
                      setIncidentType(c.value === 'GATE' ? 'SEAL_BROKEN' : 'DAMAGE');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      category === c.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Chi tiết sự cố <span className="text-red-500">*</span></label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {INCIDENT_TYPES
                  .filter((t) =>
                    category === 'GATE'
                      ? ['SEAL_BROKEN', 'SEAL_MISMATCH', 'PACKAGING_DAMAGE'].includes(t.value)
                      : ['DAMAGE', 'SHORTAGE', 'OVERAGE', 'OTHER'].includes(t.value)
                  )
                  .map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
              </select>
            </div>

            {/* Receiving ID (optional, cho QUALITY) */}
            {category === 'QUALITY' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  ID Phiếu nhập kho <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                </label>
                <input
                  type="number"
                  placeholder="Nhập receivingId nếu có"
                  value={receivingId}
                  onChange={(e) => setReceivingId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Mô tả <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                required
                placeholder="Mô tả chi tiết sự cố..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          </form>

          <div className="px-6 pb-5 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Huỷ
            </button>
            <button
              type="submit"
              form="incident-form"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const PAGE_SIZE = 10;

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await fetchIncidents({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: p,
        size: PAGE_SIZE,
      });
      setIncidents(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      setPage(p);
    } catch {
      // interceptor
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(0); }, [load]);

  const columns: Column<Incident>[] = [
    {
      key: 'incidentCode',
      title: 'Mã sự cố',
      render: (row) => <span className="font-mono text-xs font-bold text-indigo-600">{row.incidentCode}</span>,
    },
    {
      key: 'incidentType',
      title: 'Loại',
      render: (row) => <span className="text-sm text-gray-700">{row.incidentType}</span>,
    },
    {
      key: 'description',
      title: 'Mô tả',
      render: (row) => (
        <span className="text-sm text-gray-600 line-clamp-1 max-w-[200px] block">{row.description}</span>
      ),
    },
    {
      key: 'severity',
      title: 'Mức độ',
      render: (row) => {
        const colors: Record<string, string> = {
          HIGH:   'bg-red-50 text-red-700',
          MEDIUM: 'bg-orange-50 text-orange-700',
          LOW:    'bg-gray-100 text-gray-600',
        };
        return (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[row.severity] ?? 'bg-gray-100 text-gray-500'}`}>
            {row.severity}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => {
        const cfg = STATUS_BADGE[row.status] ?? { label: row.status, className: 'bg-gray-100 text-gray-500' };
        return <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>;
      },
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      render: (row) => (
        <span className="text-xs text-gray-400">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</span>
      ),
    },
  ];

  const STATUS_TABS = [
    { value: 'ALL' as const,      label: 'Tất cả' },
    { value: 'OPEN' as const,     label: 'Chờ xử lý' },
    { value: 'APPROVED' as const, label: 'Đã duyệt' },
    { value: 'REJECTED' as const, label: 'Từ chối' },
  ];

  return (
    <AdminPage
      title="Sự cố"
      description="Báo cáo và theo dõi các sự cố trong quá trình nhập/xuất kho."
      actions={
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          leftIcon={<span className="material-symbols-outlined text-sm">add</span>}
        >
          Báo cáo sự cố
        </Button>
      }
    >
      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        loading={loading}
        emptyText="Không có sự cố nào."
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPrev={() => load(page - 1)}
        onNext={() => load(page + 1)}
      />

      {showCreate && (
        <CreateIncidentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => load(0)}
        />
      )}
    </AdminPage>
  );
}
