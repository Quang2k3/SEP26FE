'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminPage } from '@/components/layout/AdminPage';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import type {
  ReceivingOrder,
  ReceivingOrderPagePayload,
} from '@/interfaces/receiving';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';
import toast from 'react-hot-toast';
import type { Column } from '@/components/ui/Table';

const DEFAULT_PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

const columns: Column<ReceivingOrder>[] = [
  {
    key: 'receivingCode',
    title: 'Receiving Code',
    render: (r) => (
      <span className="font-medium text-gray-900">{r.receivingCode}</span>
    ),
  },
  {
    key: 'status',
    title: 'Status',
    render: (r) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {r.status}
      </span>
    ),
  },
  {
    key: 'warehouse',
    title: 'Warehouse',
    render: (r) => r.warehouseName,
  },
  {
    key: 'supplier',
    title: 'Supplier',
    render: (r) => r.supplierName,
  },
  {
    key: 'totalLines',
    title: 'Lines',
    align: 'center',
    render: (r) => r.totalLines,
  },
  {
    key: 'totalQty',
    title: 'Total Qty',
    align: 'center',
    render: (r) => r.totalQty,
  },
  {
    key: 'createdAt',
    title: 'Created At',
    align: 'center',
    render: (r) => formatDateTime(r.createdAt),
  },
];

export default function ReceivingOrdersPage() {
  const [orders, setOrders] = useState<ReceivingOrder[]>([]);
  const [pageInfo, setPageInfo] = useState<Omit<ReceivingOrderPagePayload, 'content'>>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadOrders = async (override?: { page?: number; size?: number }) => {
    setLoading(true);
    try {
      const params = {
        page: override?.page ?? pageInfo.page,
        size: override?.size ?? pageInfo.size,
      };

      const result = await fetchReceivingOrders(params);

      setOrders(result.content);
      setPageInfo({
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        last: result.last,
      });
    } catch (error) {
      console.error('Failed to fetch receiving orders:', error);
      toast.error('Không thể tải danh sách Receiving Orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders({ page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;

    return orders.filter(
      (r) =>
        r.receivingCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
        r.warehouseName?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [orders, search]);

  return (
    <AdminPage
      title="Receiving Orders"
      description="Danh sách phiếu nhận hàng (Receiving Orders)"
    >
      <Card className="flex flex-col gap-3">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between"
        >
          <div className="flex flex-col gap-1.5 w-full md:w-72">
            <label className="text-sm font-medium text-gray-700">
              Tìm kiếm
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mã receiving, supplier, warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-end">
            <Link href="/receiving-orders/create">
              <Button type="button">
                + Tạo Receiving Order
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={filteredOrders}
          loading={loading}
          emptyText="Không có Receiving Orders"
          page={pageInfo.page}
          totalPages={pageInfo.totalPages}
          totalElements={pageInfo.totalElements}
          pageSize={pageInfo.size}
          onPrev={() =>
            !pageInfo.last &&
            pageInfo.page > 0 &&
            loadOrders({ page: pageInfo.page - 1 })
          }
          onNext={() =>
            !pageInfo.last &&
            pageInfo.page < pageInfo.totalPages - 1 &&
            loadOrders({ page: pageInfo.page + 1 })
          }
        />
      </Card>
    </AdminPage>
  );
}