import { Column } from '@/components/ui/Table';
import type { QCInspection } from '@/interfaces/qcInspection';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INSPECTED: 'bg-blue-100 text-blue-800',
  DECIDED: 'bg-green-100 text-green-800',
};

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getQCInspectionColumns(
  onViewDetail: (inspectionId: number) => void,
): Column<QCInspection>[] {
  return [
    {
      key: 'inspectionCode',
      title: 'Mã kiểm định',
      render: (inspection) => (
        <span
          className="font-bold text-blue-600 hover:underline cursor-pointer"
          onClick={() => onViewDetail(inspection.inspectionId)}
        >
          {inspection.inspectionCode}
        </span>
      ),
    },
    {
      key: 'lotNumber',
      title: 'Lot Number',
      render: (inspection) => (
        <span className="text-gray-700">{inspection.lotNumber}</span>
      ),
    },
    {
      key: 'skuCode',
      title: 'SKU Code',
      render: (inspection) => (
        <span className="text-gray-700">{inspection.skuCode}</span>
      ),
    },
    {
      key: 'skuName',
      title: 'SKU Name',
      render: (inspection) => (
        <span className="text-gray-700">{inspection.skuName}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (inspection) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            STATUS_COLORS[inspection.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {inspection.status}
        </span>
      ),
    },
    {
      key: 'inspectedByName',
      title: 'Người kiểm định',
      render: (inspection) => (
        <span className="text-gray-600">{inspection.inspectedByName || '-'}</span>
      ),
    },
    {
      key: 'inspectedAt',
      title: 'Ngày kiểm định',
      align: 'center',
      render: (inspection) => (
        <span className="text-gray-600">{formatDate(inspection.inspectedAt)}</span>
      ),
    },
    {
      key: 'decision',
      title: 'Quyết định',
      render: (inspection) => (
        <span className="text-gray-600">{inspection.decision || '-'}</span>
      ),
    },
  ];
}

