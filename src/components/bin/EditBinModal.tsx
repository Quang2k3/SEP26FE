'use client';

import React, { useState, useEffect } from 'react';
import type { EditBinModalProps } from '@/interfaces/modals';
import Portal from '@/components/ui/Portal';
import api from '@/config/axios';
import toast from 'react-hot-toast';

export default function EditBinModal({ open, onClose, initialData, onUpdated }: EditBinModalProps) {
  const [maxWeightKg, setMaxWeightKg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setMaxWeightKg(initialData.capacity ? String(initialData.capacity) : '');
    }
  }, [open, initialData]);

  if (!open || !initialData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/locations/${initialData.id}`, {
        maxWeightKg: maxWeightKg ? Number(maxWeightKg) : 0,
        maxVolumeM3: 0,
        isPickingFace: false,
        isStaging: false,
      });
      toast.success(`Đã cập nhật BIN: ${initialData.code}`);
      onUpdated?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
                <span className="material-symbols-outlined text-[20px]">edit_square</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Chỉnh sửa BIN</h2>
                <p className="text-xs text-gray-400 mt-0.5 font-mono font-semibold">{initialData.code}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <form id="edit-bin-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã BIN (chỉ đọc)
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                <span className="material-symbols-outlined text-gray-300 text-[15px]">lock</span>
                <span className="font-mono text-sm text-gray-500">{initialData.code}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Tải trọng tối đa (kg)
              </label>
              <input
                autoFocus
                type="number" min="0" step="0.1" placeholder="0"
                value={maxWeightKg}
                onChange={e => setMaxWeightKg(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-center"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              form="edit-bin-form"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving
                ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[15px]">save</span>
              }
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
