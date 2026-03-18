'use client';

import { fetchGrns } from '@/services/grnService';
import { fetchOutboundOrders } from '@/services/outboundService';

export interface ThroughputPoint {
  label: string;   // "T2", "T3"… hoặc "CN"
  date: string;    // "2026-03-18"
  inbound: number; // số GRN POSTED trong ngày
  outbound: number;// số Outbound DISPATCHED trong ngày
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Trả về mảng 7 ngày (D-6 → hôm nay), mỗi phần tử là ThroughputPoint */
export async function fetchThroughput7Days(): Promise<ThroughputPoint[]> {
  // ── Build date range ──────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days: { date: Date; key: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    days.push({ date: d, key });
  }

  // ── Fetch cả hai nguồn song song ─────────────────────────────────────────
  const [grnPage, outboundPage] = await Promise.allSettled([
    fetchGrns({ size: 500 }),
    fetchOutboundOrders({ size: 500 } as any),
  ]);

  // ── Map GRN POSTED theo ngày ──────────────────────────────────────────────
  const inboundByDay: Record<string, number> = {};
  if (grnPage.status === 'fulfilled') {
    for (const grn of grnPage.value.content) {
      if (grn.status !== 'POSTED') continue;
      const dateKey = (grn.createdAt ?? '').slice(0, 10);
      if (dateKey) inboundByDay[dateKey] = (inboundByDay[dateKey] ?? 0) + 1;
    }
  }

  // ── Map Outbound DISPATCHED theo ngày ─────────────────────────────────────
  const outboundByDay: Record<string, number> = {};
  if (outboundPage.status === 'fulfilled') {
    const content = outboundPage.value.content ?? [];
    for (const order of content) {
      if (order.status !== 'DISPATCHED') continue;
      const dateKey = (order.createdAt ?? '').slice(0, 10);
      if (dateKey) outboundByDay[dateKey] = (outboundByDay[dateKey] ?? 0) + 1;
    }
  }

  // ── Assemble kết quả ─────────────────────────────────────────────────────
  return days.map(({ date, key }) => ({
    label: DAY_LABELS[date.getDay()],
    date: key,
    inbound:  inboundByDay[key]  ?? 0,
    outbound: outboundByDay[key] ?? 0,
  }));
}