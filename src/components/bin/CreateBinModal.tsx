'use client';

import React, { useState, useEffect } from 'react';
import type { CreateBinModalProps } from '@/interfaces/modals';
import Portal from '@/components/ui/Portal';
import api from '@/config/axios';
import toast from 'react-hot-toast';

export default function CreateBinModal({ open, onClose, zoneId, onCreated }: CreateBinModalProps) {
  const [code, setCode] = useState('');
  const [maxWeightKg, setMaxWeightKg] = useState('');
  const [maxVolumeM3, setMaxVolumeM3] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setMaxWeightKg('');
      setMaxVolumeM3('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) { toast.error('Nhập mã BIN'); return; }
    setSaving(true);
    try {
      await api.post('/locations', {
        zoneId,
        locationCode: trimmed,
        locationType: 'BIN',
        maxWeightKg: maxWeightKg ? Number(maxWeightKg) : undefined,
        maxVolumeM3: maxVolumeM3 ? Number(maxVolumeM3) : undefined,
      });
      toast.success(`Đã tạo BIN: ${trimmed}`);
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo BIN thất bại');
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Tạo BIN mới</h2>
                <p className="text-xs text-gray-400 mt-0.5">Zone ID: <span className="font-mono font-semibold">{zoneId}</span></p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <form id="create-bin-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã BIN <span className="text-red-400 normal-case font-normal">*</span>
              </label>
              <input
                autoFocus
                type="text"
                required
                placeholder="VD: A01-R01-B01"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono placeholder:font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Tải trọng (kg)
                </label>
                <input
                  type="number" min="0" step="0.1" placeholder="0"
                  value={maxWeightKg}
                  onChange={e => setMaxWeightKg(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Thể tích (m³)
                </label>
                <input
                  type="number" min="0" step="0.01" placeholder="0"
                  value={maxVolumeM3}
                  onChange={e => setMaxVolumeM3(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
                />
              </div>
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
              form="create-bin-form"
              disabled={saving || !code.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving
                ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[15px]">add</span>
              }
              {saving ? 'Đang tạo...' : 'Tạo BIN'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
