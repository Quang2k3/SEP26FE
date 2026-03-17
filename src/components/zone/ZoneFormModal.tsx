'use client';

import React, { useState, useEffect } from 'react';
import type { ZoneFormModalProps } from '@/interfaces/modals';
import Portal from '@/components/ui/Portal';
import api from '@/config/axios';
import toast from 'react-hot-toast';

export default function ZoneFormModal({ open, onClose, initialData }: ZoneFormModalProps) {
  const isEdit = !!initialData?.id;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(initialData?.code ?? '');
      setName(initialData?.name ?? '');
      setDescription(initialData?.description ?? '');
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) { toast.error('Nhập đầy đủ mã và tên zone'); return; }
    setSaving(true);
    try {
      if (isEdit && initialData?.id) {
        await api.put(`/zones/${initialData.id}`, { zoneName: name.trim(), description: description.trim() || null });
        toast.success(`Đã cập nhật Zone: ${code}`);
      } else {
        await api.post('/zones', { zoneCode: code.trim(), zoneName: name.trim(), description: description.trim() || null });
        toast.success(`Đã tạo Zone: ${code.trim()}`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Thao tác thất bại');
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
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                <span className="material-symbols-outlined text-[20px]">{isEdit ? 'edit_document' : 'add_box'}</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{isEdit ? 'Chỉnh sửa Zone' : 'Tạo Zone mới'}</h2>
                {isEdit && <p className="text-xs text-gray-400 mt-0.5 font-mono font-semibold">{initialData?.code}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <form id="zone-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã Zone {!isEdit && <span className="text-red-400 normal-case font-normal">*</span>}
              </label>
              {isEdit ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                  <span className="material-symbols-outlined text-gray-300 text-[15px]">lock</span>
                  <span className="font-mono text-sm text-gray-500">{code}</span>
                </div>
              ) : (
                <input
                  autoFocus
                  type="text" required placeholder="VD: Z-INB, Z-A01..."
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono placeholder:font-sans"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Tên Zone <span className="text-red-400 normal-case font-normal">*</span>
              </label>
              <input
                type="text" required placeholder="VD: Khu nhận hàng..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mô tả
              </label>
              <textarea
                rows={2} placeholder="Mô tả ngắn về zone..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
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
              form="zone-form"
              disabled={saving}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 ${isEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving
                ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[15px]">{isEdit ? 'save' : 'add'}</span>
              }
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo Zone'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
