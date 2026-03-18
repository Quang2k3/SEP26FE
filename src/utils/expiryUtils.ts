// ─── Expiry validation utilities cho kho hóa chất ────────────────────────────
// Dùng chung cho CreateReceivingOrderModal, ReceivingDetailModal, ScannerPage, v.v.

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Ngưỡng cảnh báo theo chính sách kho hóa chất
export const EXPIRY_THRESHOLDS = {
  BLOCK: 60,  // <60 ngày → từ chối nhận
  WARN: 90,   // <90 ngày → cảnh báo vàng
} as const;

export type ExpiryLevel = 'ok' | 'warn' | 'expired';

export interface ExpiryInfo {
  level: ExpiryLevel;
  daysLeft: number;
  label: string;
  action?: string;
}

export function getExpiryInfo(expiryDate: string | null | undefined): ExpiryInfo | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const now = today();
  const daysLeft = Math.floor((exp.getTime() - now.getTime()) / 86_400_000);

  if (daysLeft < 0) {
    return {
      level: 'expired',
      daysLeft,
      label: `Hết hạn ${Math.abs(daysLeft)} ngày trước`,
      action: 'Từ chối nhận — không nhập kho',
    };
  }
  if (daysLeft < EXPIRY_THRESHOLDS.BLOCK) {
    return {
      level: 'expired',
      daysLeft,
      label: `Còn ${daysLeft} ngày HSD`,
      action: 'Dưới 60 ngày — không được nhận',
    };
  }
  if (daysLeft <= EXPIRY_THRESHOLDS.WARN) {
    return {
      level: 'warn',
      daysLeft,
      label: `Còn ${daysLeft} ngày HSD`,
      action: 'Ưu tiên xuất trước (FEFO)',
    };
  }
  return { level: 'ok', daysLeft, label: `Còn ${daysLeft} ngày HSD` };
}

export const EXPIRY_STYLE: Record<
  ExpiryLevel,
  {
    bg: string;
    text: string;
    border: string;
    icon: string;
    inputBorder: string;
    inputBg: string;
    badgeBg: string;
  }
> = {
  ok: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'check_circle',
    inputBorder: 'border-emerald-300',
    inputBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
  },
  warn: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: 'warning',
    inputBorder: 'border-amber-400',
    inputBg: 'bg-amber-50',
    badgeBg: 'bg-amber-100',
  },
  expired: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-400',
    icon: 'dangerous',
    inputBorder: 'border-red-500',
    inputBg: 'bg-red-50',
    badgeBg: 'bg-red-100',
  },
};

/** Badge nhỏ dùng trong bảng */
export function formatExpiryBadge(expiryDate: string | null | undefined): {
  text: string;
  level: ExpiryLevel | null;
} {
  if (!expiryDate) return { text: '—', level: null };
  const info = getExpiryInfo(expiryDate);
  if (!info) return { text: expiryDate, level: null };
  return {
    text: `${expiryDate} (${info.daysLeft}d)`,
    level: info.level,
  };
}

/** Validate cả cặp ngày SX + HSD, trả về error messages */
export function validateReceivingDates(
  manufactureDate: string,
  expiryDate: string
): { mfgError?: string; expError?: string } {
  const errors: { mfgError?: string; expError?: string } = {};
  const now = today();

  if (manufactureDate) {
    const mfg = new Date(manufactureDate);
    mfg.setHours(0, 0, 0, 0);
    if (mfg > now) errors.mfgError = 'Ngày sản xuất không được ở tương lai';
  }

  if (expiryDate) {
    const info = getExpiryInfo(expiryDate);
    if (info) {
      if (info.level === 'expired' && info.daysLeft < 0)
        errors.expError = `Hàng đã hết hạn — ${info.label}`;
      else if (info.level === 'expired')
        errors.expError = `Không nhận — còn ${info.daysLeft} ngày (dưới 60 ngày)`;
      else if (info.level === 'warn')
        errors.expError = `Lưu ý: ${info.label} — ưu tiên FEFO`;
    }
    if (manufactureDate && !errors.expError) {
      const mfg = new Date(manufactureDate);
      const exp = new Date(expiryDate);
      if (exp <= mfg) errors.expError = 'Hạn dùng phải sau ngày sản xuất';
    }
  }

  return errors;
}