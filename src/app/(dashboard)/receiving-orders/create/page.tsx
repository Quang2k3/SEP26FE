'use client';

import React, { useEffect, useState } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReceivingOrderRequest } from '@/interfaces/receiving';
import { createReceivingOrder } from '@/services/receivingOrdersService';
import { fetchWarehouses } from '@/services/warehouseService';
import type { Warehouse } from '@/interfaces/warehouse';
import toast from 'react-hot-toast';

const SOURCE_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RETURN', label: 'Return' },
];

export default function CreateReceivingOrderPage() {
  const [header, setHeader] = useState<ReceivingOrderRequest>({
    sourceType: '',
    sourceReferenceCode: '',
    supplierCode: '',
    sourceWarehouseId: -1,
    note: '',
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleHeaderChange = (field: keyof ReceivingOrderRequest, value: string | number) => {
    setHeader((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const data = await fetchWarehouses();
        setWarehouses(data);

        // Nếu chưa chọn kho, auto chọn kho đầu tiên
        if (data.length > 0 && !header.sourceWarehouseId) {
          setHeader((prev) => ({
            ...prev,
            sourceWarehouseId: data[0].warehouseId,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        toast.error('Không thể tải danh sách kho');
      } finally {
        setLoadingWarehouses(false);
      }
    };

    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sourceType = header.sourceType?.trim();
    const sourceRef = header.sourceReferenceCode?.trim();
    const supplier = header.supplierCode?.trim();

    if (!sourceType || !sourceRef || !supplier) {
      toast.error('Source Type, Reference Code và Supplier Code là bắt buộc');
      return;
    }

    if (!header.sourceWarehouseId || header.sourceWarehouseId <= 0) {
      toast.error('Source Warehouse Id phải > 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ReceivingOrderRequest = {
        sourceType,
        sourceReferenceCode: sourceRef,
        supplierCode: supplier,
        sourceWarehouseId: header.sourceWarehouseId,
        note: header.note,
      };

      await createReceivingOrder(payload);
      toast.success('Tạo Receiving Order thành công');

      setHeader({
        sourceType: '',
        sourceReferenceCode: '',
        supplierCode: '',
        sourceWarehouseId: -1,
        note: '',
      });
    } catch (error) {
      console.error('Failed to create receiving order:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPage
      title="Create Receiving Order"
      description="Tạo phiếu nhận hàng mới (Receiving Order)"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Thông tin nguồn hàng">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Source Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={header.sourceType}
                onChange={(e) => handleHeaderChange('sourceType', e.target.value)}
              >
                <option value="" disabled>
                  Chọn Source Type
                </option>
                {SOURCE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Source Reference Code <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="PO-20231015-01"
                value={header.sourceReferenceCode}
                onChange={(e) => handleHeaderChange('sourceReferenceCode', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Supplier Code <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SUP001"
                value={header.supplierCode}
                onChange={(e) => handleHeaderChange('supplierCode', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Source Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={header.sourceWarehouseId || ''}
                disabled={loadingWarehouses || warehouses.length === 0}
                onChange={(e) =>
                  handleHeaderChange('sourceWarehouseId', Number(e.target.value) || 0)
                }
              >
                <option value="" disabled>
                  {loadingWarehouses ? 'Đang tải danh sách kho...' : 'Chọn kho'}
                </option>
                {warehouses.map((wh) => (
                  <option key={wh.warehouseId} value={wh.warehouseId}>
                    {wh.warehouseCode} - {wh.warehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Note</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Ghi chú ban đầu..."
                value={header.note ?? ''}
                onChange={(e) => handleHeaderChange('note', e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="md"
            isLoading={submitting}
          >
            Tạo Receiving Order
          </Button>
        </div>
      </form>
    </AdminPage>
  );
}

