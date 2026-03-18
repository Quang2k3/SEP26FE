'use client';

import { fetchGrns } from '@/services/grnService';
import { fetchOutboundOrders } from '@/services/outboundService';

export interface ThroughputPoint {
  label: string;
  date: string;
  inbound: number;
  outbound: number;
}

export type ThroughputRange = 'week' | 'month' | 'year';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_LABELS = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Local date string YYYY-MM-DD (tránh UTC offset) */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateKey(d: Date, range: ThroughputRange): string {
  if (range === 'week')  return localDateKey(d);
  if (range === 'month') return localDateKey(d);          // group theo ngày trong tháng
  if (range === 'year')  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return localDateKey(d);
}

function buildBuckets(range: ThroughputRange): { key: string; label: string; sublabel?: string }[] {
  const now = new Date();

  if (range === 'week') {
    // 7 ngày gần nhất
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const isToday = i === 6;
      return {
        key: localDateKey(d),
        label: isToday ? 'Hôm nay' : DAY_LABELS[d.getDay()],
        sublabel: `${d.getDate()}/${d.getMonth() + 1}`,
      };
    });
  }

  if (range === 'month') {
    // Tất cả các ngày trong tháng hiện tại (1 → hôm nay)
    const year  = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    return Array.from({ length: today }, (_, i) => {
      const day = i + 1;
      const d   = new Date(year, month, day);
      const key = localDateKey(d);
      // Chỉ hiện label mỗi 5 ngày để tránh chật
      const label = (day === 1 || day % 5 === 0 || day === today) ? String(day) : '';
      return { key, label, sublabel: `${day}/${month + 1}` };
    });
  }

  if (range === 'year') {
    // 12 tháng gần nhất
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: MONTH_LABELS[d.getMonth()],
        sublabel: `${d.getMonth() + 1}/${d.getFullYear()}`,
      };
    });
  }

  return [];
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchThroughput(range: ThroughputRange): Promise<ThroughputPoint[]> {
  const [grnPage, outboundPage] = await Promise.allSettled([
    fetchGrns({ size: 500 }),
    fetchOutboundOrders({ size: 500 } as any),
  ]);

  const inboundByKey: Record<string, number> = {};
  if (grnPage.status === 'fulfilled') {
    for (const grn of grnPage.value.content) {
      if (grn.status !== 'POSTED') continue;
      const d = new Date(grn.createdAt ?? '');
      if (isNaN(d.getTime())) continue;
      const k = dateKey(d, range);
      inboundByKey[k] = (inboundByKey[k] ?? 0) + 1;
    }
  }

  const outboundByKey: Record<string, number> = {};
  if (outboundPage.status === 'fulfilled') {
    for (const order of outboundPage.value.content ?? []) {
      if (order.status !== 'DISPATCHED') continue;
      const d = new Date(order.createdAt ?? '');
      if (isNaN(d.getTime())) continue;
      const k = dateKey(d, range);
      outboundByKey[k] = (outboundByKey[k] ?? 0) + 1;
    }
  }

  const buckets = buildBuckets(range);
  return buckets.map(({ key, label, sublabel }) => ({
    label,
    date: key,
    sublabel,
    inbound:  inboundByKey[key]  ?? 0,
    outbound: outboundByKey[key] ?? 0,
  }));
}

export async function fetchThroughput7Days(): Promise<ThroughputPoint[]> {
  return fetchThroughput('week');
}