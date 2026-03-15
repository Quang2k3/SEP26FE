'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { MeUser } from '@/interfaces/profile';
import { changePassword } from '@/services/authService';
import { useConfirm } from '@/components/ui/ModalProvider';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const API_ORIGIN = API_BASE.replace(/\/v1\/?$/, '');

function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
}

function bustCache(url: string | null): string | null {
  if (!url) return null;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${Date.now()}`;
}

// ─── Validation Rules ────────────────────────────────────────────────────────

/**
 * Đầu số di động Việt Nam hợp lệ (10 chữ số, bắt đầu bằng 0)
 * Viettel:      032-039, 086, 096, 097, 098
 * Mobifone:     070, 076, 077, 078, 079, 089, 090, 093
 * Vinaphone:    081, 082, 083, 084, 085, 088, 091, 094
 * Vietnamobile: 052, 056, 058, 092
 * Gmobile:      059, 099
 * Reddi:        055
 */
const VN_PHONE_REGEX = /^(03[2-9]|05[2-9]|07[06-9]|08[1-9]|09[0-9])\d{7}$/;

/**
 * Họ tên: chỉ chứa chữ cái (kể cả tiếng Việt có dấu) và khoảng trắng
 */
const FULL_NAME_REGEX = /^[\p{L}\s]{2,200}$/u;

function validateFullName(v: string): string {
  if (!v.trim()) return 'Họ và tên không được để trống';
  if (v.trim().split(/\s+/).length < 2) return 'Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ)';
  if (!FULL_NAME_REGEX.test(v.trim())) return 'Họ tên không được chứa số hoặc ký tự đặc biệt';
  return '';
}

function validatePhone(v: string): string {
  if (!v.trim()) return ''; // không bắt buộc
  if (!VN_PHONE_REGEX.test(v.trim())) {
    return 'Số điện thoại không hợp lệ. VD: 0912 345 678';
  }
  return '';
}

function validateDateOfBirth(v: string): string {
  if (!v) return ''; // không bắt buộc
  const dob = new Date(v);
  if (isNaN(dob.getTime())) return 'Ngày sinh không hợp lệ';
  const today = new Date();
  if (dob > today) return 'Ngày sinh không thể ở tương lai';
  let age = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasBirthdayPassed) age--;
  if (age < 15) return 'Bạn phải đủ 15 tuổi trở lên';
  if (age > 100) return 'Ngày sinh không hợp lệ (quá 100 năm)';
  return '';
}

function validateAddress(v: string): string {
  if (!v.trim()) return ''; // không bắt buộc
  if (v.trim().length < 5) return 'Địa chỉ quá ngắn (tối thiểu 5 ký tự)';
  if (v.trim().length > 300) return 'Địa chỉ quá dài (tối đa 300 ký tự)';
  return '';
}

/** Ngày tối đa cho phép chọn = hôm nay - 15 năm */
function maxDobDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 15);
  return d.toISOString().split('T')[0];
}

/** Ngày tối thiểu hợp lý = hôm nay - 100 năm */
function minDobDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().split('T')[0];
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputBase = "w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white text-gray-800 placeholder:text-gray-400";
const inputOkCls  = `${inputBase} border-indigo-100 focus:ring-indigo-400`;
const inputErrCls = `${inputBase} border-red-300 bg-red-50/40 focus:ring-red-300`;
const readonlyCls = "w-full px-3.5 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed";

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5 normal-case">*</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
          <span className="material-symbols-outlined text-[13px]">error</span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Password Modal ───────────────────────────────────────────────────────────

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow]     = useState({ cur: false, nw: false, cf: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validatePw = () => {
    const e: Record<string, string> = {};
    if (!form.currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (form.newPassword.length < 8) e.newPassword = 'Mật khẩu mới phải ít nhất 8 ký tự';
    else if (!/[A-Z]/.test(form.newPassword)) e.newPassword = 'Phải có ít nhất 1 chữ hoa (A-Z)';
    else if (!/[0-9]/.test(form.newPassword)) e.newPassword = 'Phải có ít nhất 1 chữ số (0-9)';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Xác nhận mật khẩu không khớp';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePw();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await changePassword(form) as any;
      toast.success(res?.message ?? 'Đổi mật khẩu thành công');
      onClose();
    } catch { } finally { setLoading(false); }
  };

  const PwField = ({
    label, fkey, sk,
  }: {
    label: string;
    fkey: 'currentPassword' | 'newPassword' | 'confirmPassword';
    sk: 'cur' | 'nw' | 'cf';
  }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show[sk] ? 'text' : 'password'}
          value={form[fkey]}
          onChange={e => { setForm({ ...form, [fkey]: e.target.value }); setErrors(p => ({ ...p, [fkey]: '' })); }}
          placeholder="••••••••"
          className={`${errors[fkey] ? inputErrCls : inputOkCls} pr-10`}
        />
        <button type="button" onClick={() => setShow(s => ({ ...s, [sk]: !s[sk] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors">
          <span className="material-symbols-outlined text-[18px]">{show[sk] ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {errors[fkey] && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <span className="material-symbols-outlined text-[13px]">error</span>{errors[fkey]}
        </p>
      )}
    </div>
  );

  const pw = form.newPassword;
  const rules = [
    { label: 'Tối thiểu 8 ký tự',       ok: pw.length >= 8 },
    { label: 'Ít nhất 1 chữ hoa (A-Z)', ok: /[A-Z]/.test(pw) },
    { label: 'Ít nhất 1 chữ số (0-9)',  ok: /[0-9]/.test(pw) },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(79,70,229,0.12)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-indigo-100 overflow-hidden"
        style={{ boxShadow: '0 24px 60px rgba(99,102,241,0.15)' }}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">key</span>
            </div>
            <h2 className="text-base font-bold text-gray-900">Đổi mật khẩu</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <PwField label="Mật khẩu hiện tại" fkey="currentPassword" sk="cur" />
          <PwField label="Mật khẩu mới" fkey="newPassword" sk="nw" />

          {/* Password strength checklist */}
          <ul className="space-y-1 -mt-1 pl-0.5">
            {rules.map(r => (
              <li key={r.label} className={`flex items-center gap-1.5 text-xs transition-colors ${r.ok ? 'text-emerald-500' : 'text-gray-400'}`}>
                <span className="material-symbols-outlined text-[13px]">
                  {r.ok ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {r.label}
              </li>
            ))}
          </ul>

          <PwField label="Xác nhận mật khẩu mới" fkey="confirmPassword" sk="cf" />
          <div className="pt-2 flex justify-end gap-2.5">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
              {loading
                ? <><span className="w-4 h-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Đang lưu...</>
                : <><span className="material-symbols-outlined text-[16px]">lock_reset</span>Cập nhật</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [userData, setUserData]           = useState<MeUser | null>(null);
  const [loading, setLoading]             = useState(true);
  const [fullName, setFullName]           = useState('');
  const [phone, setPhone]                 = useState('');
  const [gender, setGender]               = useState('');
  const [dateOfBirth, setDateOfBirth]     = useState('');
  const [address, setAddress]             = useState('');
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [showPwModal, setShowPwModal]     = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  // ── Fetch profile ──
  const fetchProfile = async () => {
    try {
      const res = await api.get<ApiResponse<MeUser>>('/auth/me');
      const u = res.data.data;
      if (!u) return;
      setUserData(u);
      setFullName(u.fullName ?? '');
      setPhone(u.phone ?? '');
      setGender(u.gender ?? '');
      setDateOfBirth(u.dateOfBirth ?? '');
      setAddress(u.address ?? '');
      setAvatarPreview(resolveAvatarUrl(u.avatarUrl));
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line

  // ── Validate toàn form (trước khi submit) ──
  const validateAll = (): boolean => {
    const e: Record<string, string> = {};
    const n = validateFullName(fullName);  if (n) e.fullName = n;
    const p = validatePhone(phone);        if (p) e.phone = p;
    const d = validateDateOfBirth(dateOfBirth); if (d) e.dateOfBirth = d;
    const a = validateAddress(address);    if (a) e.address = a;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validate khi rời khỏi field (onBlur) ──
  const handleBlur = (field: string, value: string) => {
    let err = '';
    if (field === 'fullName')    err = validateFullName(value);
    if (field === 'phone')       err = validatePhone(value);
    if (field === 'dateOfBirth') err = validateDateOfBirth(value);
    if (field === 'address')     err = validateAddress(value);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  // ── Avatar upload ──
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận định dạng JPG, PNG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File ảnh tối đa 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Submit ──
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      toast.error('Vui lòng kiểm tra lại các trường bị lỗi');
      return;
    }
    confirm({
      title: 'Lưu thay đổi hồ sơ',
      description: 'Bạn có chắc muốn cập nhật thông tin cá nhân không?',
      variant: 'info',
      icon: 'save',
      confirmText: 'Lưu thay đổi',
      onConfirm: doSave,
    });
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (fullName.trim())  fd.append('fullName', fullName.trim());
      if (phone.trim())     fd.append('phone', phone.trim());
      if (gender)           fd.append('gender', gender);
      if (dateOfBirth)      fd.append('dateOfBirth', dateOfBirth);
      if (address.trim())   fd.append('address', address.trim());
      if (avatarFile)       fd.append('avatar', avatarFile);

      const res = await api.put<ApiResponse<any>>('/profile/update-profile', fd);
      const updated = res.data.data;
      if (updated) {
        setUserData(updated);
        const newAvatarUrl = bustCache(resolveAvatarUrl(updated.avatarUrl));
        setAvatarPreview(newAvatarUrl);
        setAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        try {
          const stored = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
          localStorage.setItem('auth_user', JSON.stringify({
            ...stored,
            fullName: updated.fullName ?? stored.fullName,
            avatarUrl: updated.avatarUrl ?? stored.avatarUrl,
          }));
          window.dispatchEvent(new Event('profile-updated'));
        } catch { }
      }
      toast.success('Cập nhật hồ sơ thành công');
    } catch { } finally { setSaving(false); }
  };

  const roleLabels: Record<string, string> = {
    MANAGER: 'Warehouse Manager', QC: 'Quality Control', KEEPER: 'Warehouse Keeper',
  };
  const roleColors: Record<string, string> = {
    MANAGER: 'bg-violet-100 text-violet-700',
    QC: 'bg-amber-100 text-amber-700',
    KEEPER: 'bg-emerald-100 text-emerald-700',
  };

  const initials = fullName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
  const hasErrors = Object.values(errors).some(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-[36px] animate-spin text-indigo-400">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="w-full font-sans space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Hồ sơ cá nhân</h1>
          <p className="mt-0.5 text-sm text-gray-500">Quản lý thông tin tài khoản và bảo mật.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08)' }}>

            <div className="h-20 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#3b82f6 100%)' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 12px)', backgroundSize: '17px 17px' }} />
            </div>

            <div className="px-5 pb-5">
              <div className="relative -mt-10 mb-4 flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg ring-4 ring-white"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">{initials}</span>
                    )}
                  </div>
                  <label
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md ring-2 ring-white transition-all hover:scale-110"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}
                    title="Đổi ảnh đại diện (JPG, PNG, WEBP · tối đa 5MB)"
                  >
                    <span className="material-symbols-outlined text-white text-[13px]">photo_camera</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h2 className="text-base font-bold text-gray-900 leading-tight">{userData?.fullName ?? '—'}</h2>
                <p className="text-xs text-gray-400 truncate">{userData?.email}</p>
                <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                  {(userData?.roleCodes ?? []).map(r => (
                    <span key={r} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[r] ?? 'bg-gray-100 text-gray-600'}`}>
                      {roleLabels[r] ?? r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="my-4 border-t border-gray-100" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0"
                    style={{ color: userData?.status === 'ACTIVE' ? '#10b981' : '#9ca3af' }}>circle</span>
                  <span className={`font-medium text-sm ${userData?.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {userData?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}
                  </span>
                </div>
                {userData?.lastLoginAt && (
                  <div className="flex items-start gap-2.5 text-gray-500">
                    <span className="material-symbols-outlined text-[16px] text-indigo-300 flex-shrink-0 mt-0.5">schedule</span>
                    <span className="text-xs">Đăng nhập lần cuối<br />
                      <span className="font-medium text-gray-600">{new Date(userData.lastLoginAt).toLocaleString('vi-VN')}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2.5 text-gray-500">
                  <span className="material-symbols-outlined text-[16px] text-indigo-300 flex-shrink-0 mt-0.5">calendar_today</span>
                  <span className="text-xs">Ngày tạo tài khoản<br />
                    <span className="font-medium text-gray-600">
                      {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </span>
                </div>
              </div>

              {avatarFile && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-[14px]">image</span>
                  <span className="flex-1 truncate">{avatarFile.name}</span>
                  <button type="button" onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(resolveAvatarUrl(userData?.avatarUrl));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }} className="text-amber-500 hover:text-red-500 flex-shrink-0 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Security card */}
          <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5"
            style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.06)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">shield</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Bảo mật</h3>
                <p className="text-xs text-gray-400 mt-0.5">Quản lý mật khẩu</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowPwModal(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-all border hover:border-indigo-200 hover:bg-indigo-50/50"
              style={{ background: '#f8faff', borderColor: '#e0e7ff' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">key</span>
                Đổi mật khẩu
              </div>
              <span className="material-symbols-outlined text-[16px] text-gray-300">arrow_forward_ios</span>
            </button>
          </div>

        </div>

        {/* ── Right column — Edit form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave}
            className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden h-full flex flex-col"
            style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.07)' }}>

            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Thông tin cá nhân</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chỉ các trường có nội dung sẽ được cập nhật</p>
            </div>

            <div className="px-6 py-5 flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Họ và tên */}
                <Field label="Họ và tên" required error={errors.fullName}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                    onBlur={e => handleBlur('fullName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    disabled={saving}
                    className={errors.fullName ? inputErrCls : inputOkCls}
                  />
                </Field>

                {/* Email — readonly */}
                <Field label="Email" hint="Email không thể thay đổi">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">mail</span>
                    <input type="email" value={userData?.email ?? ''} readOnly disabled className={`${readonlyCls} pl-9`} />
                  </div>
                </Field>

                {/* Số điện thoại */}
                <Field
                  label="Số điện thoại"
                  error={errors.phone}
                  hint={!errors.phone ? 'Đầu số VN: 03x, 05x, 07x, 08x, 09x — 10 chữ số' : undefined}
                >
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">phone</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => {
                        // Chỉ nhận ký tự số, tối đa 10
                        const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(v);
                        setErrors(p => ({ ...p, phone: '' }));
                      }}
                      onBlur={e => handleBlur('phone', e.target.value)}
                      placeholder="0912 345 678"
                      disabled={saving}
                      maxLength={10}
                      inputMode="numeric"
                      className={`${errors.phone ? inputErrCls : inputOkCls} pl-9`}
                    />
                    {/* Hiển thị số ký tự đã nhập */}
                    {phone.length > 0 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${phone.length === 10 ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {phone.length}/10
                      </span>
                    )}
                  </div>
                </Field>

                {/* Giới tính */}
                <Field label="Giới tính">
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      disabled={saving}
                      className={`${inputOkCls} appearance-none cursor-pointer pr-9`}
                    >
                      <option value="">-- Chọn giới tính --</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </Field>

                {/* Ngày sinh */}
                <Field
                  label="Ngày sinh"
                  error={errors.dateOfBirth}
                  hint={!errors.dateOfBirth ? 'Phải đủ 15 tuổi trở lên' : undefined}
                >
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => { setDateOfBirth(e.target.value); setErrors(p => ({ ...p, dateOfBirth: '' })); }}
                    onBlur={e => handleBlur('dateOfBirth', e.target.value)}
                    min={minDobDate()}
                    max={maxDobDate()}
                    disabled={saving}
                    className={errors.dateOfBirth ? inputErrCls : inputOkCls}
                  />
                </Field>

                <div />
              </div>

              {/* Địa chỉ */}
              <Field label="Địa chỉ" error={errors.address}>
                <textarea
                  value={address}
                  onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: '' })); }}
                  onBlur={e => handleBlur('address', e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  rows={3}
                  disabled={saving}
                  maxLength={300}
                  className={`${errors.address ? inputErrCls : inputOkCls} resize-none`}
                />
                <p className={`text-xs text-right mt-0.5 ${address.length >= 280 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {address.length}/300
                </p>
              </Field>
            </div>

            {/* Form footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between rounded-b-2xl"
              style={{ background: 'linear-gradient(90deg,#f8faff,#f5f3ff)' }}>
              {hasErrors ? (
                <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Vui lòng kiểm tra lại thông tin
                </span>
              ) : avatarFile ? (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Có ảnh đại diện chưa được lưu
                </span>
              ) : (
                <span className="text-xs text-gray-400">Điền vào ô muốn thay đổi rồi bấm lưu</span>
              )}
              <button
                type="submit"
                disabled={loading || saving || hasErrors}
                className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}
              >
                {saving
                  ? <><span className="w-4 h-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Đang lưu...</>
                  : <><span className="material-symbols-outlined text-[16px]">save</span>Lưu thay đổi</>
                }
              </button>
            </div>
          </form>
        </div>

      </div>

      {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  );
}
