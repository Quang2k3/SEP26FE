'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { fetchPickListByDocument } from '@/services/outboundService';

interface Props {
  soId: number;
  soCode: string;
}

function buildPickHtml(pickList: any, soCode: string): string {
  const now = new Date().toLocaleDateString('vi-VN');
  const items = pickList.items ?? [];
  let totalQty = 0;

  const rows = items.map((item: any, idx: number) => {
    const qty = Number(item.qtyToPick ?? item.requiredQty ?? 0);
    totalQty += qty;
    const expiryStr = item.expiryDate
      ? new Date(item.expiryDate).toLocaleDateString('vi-VN')
      : '—';
    const lotStr = item.lotNumber ?? '—';
    return `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td style="text-align:center;font-weight:700;color:#1a5276">${item.zoneCode ?? ''}</td>
      <td style="font-weight:600;font-size:10px">${item.locationCode ?? ''}</td>
      <td style="text-align:center;font-family:monospace;font-size:9px">${item.skuCode ?? ''}</td>
      <td style="font-size:9.5px">${item.skuName ?? ''}</td>
      <td style="text-align:center;font-weight:700;color:#7d3c98;font-size:9px">${lotStr}</td>
      <td style="text-align:center;font-size:9px;color:${item.expiryDate ? '#c0392b' : '#888'};font-weight:${item.expiryDate ? '700' : '400'}">${expiryStr}</td>
      <td style="text-align:center;font-weight:700;font-size:12px;color:#1a5276">${qty}</td>
      <td style="text-align:center"></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Phiếu Lấy Hàng - ${soCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Be Vietnam Pro',sans-serif; font-size:9.5px; color:#111; background:#fff; padding:8mm 8mm; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
    .title { font-size:14px; font-weight:700; text-align:center; flex:1; }
    .divider { border:none; border-top:1.5px solid #1a5276; margin:6px 0 10px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:3px 0; margin-bottom:10px; }
    .info-row { display:flex; gap:6px; }
    .info-label { font-weight:700; min-width:80px; white-space:nowrap; }
    .notice { background:#fef9e7; border:1px solid #f0b429; border-radius:5px; padding:5px 8px; font-size:8.5px; color:#7d5a00; margin-bottom:8px; }
    table { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:9.5px; }
    th { background:#d6eaf8; border:0.5px solid #aed6f1; padding:3px 3px; text-align:center; font-weight:700; vertical-align:middle; }
    td { border:0.5px solid #aed6f1; padding:2.5px 3px; vertical-align:middle; }
    tr:nth-child(even) td { background:#f0f9ff; }
    .total-row td { background:#d6eaf8!important; font-weight:700; text-align:center; }
    .sig-table th { background:#d6eaf8; }
    .sig-table td { height:56px; vertical-align:top; padding-top:6px; font-size:9px; }
    .sig-note { font-size:8px; color:#888; margin-top:8px; text-align:center; }
    @media print { @page { size:A4; margin:6mm 8mm; } body { padding:0; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:8px;min-width:140px">
      <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1a5276,#2980b9);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 96 960 960" fill="white">
          <path d="M200 896q-33 0-56.5-23.5T120 816V376q0-33 23.5-56.5T200 296h160v-80q0-33 23.5-56.5T440 136h80q33 0 56.5 23.5T600 216v80h160q33 0 56.5 23.5T840 376v440q0 33-23.5 56.5T760 896H200Zm0-80h560V376H200v440Zm80-80h400v-80H280v80Zm0-160h400v-80H280v80ZM440 296h80v-80h-80v80Z"/>
        </svg>
      </div>
      <div>
        <div style="font-size:11px;font-weight:800;color:#1a1a2e;letter-spacing:0.3px;line-height:1.1">WMS Portal</div>
        <div style="font-size:7px;color:#2980b9;font-weight:600;letter-spacing:0.5px">WAREHOUSE MANAGEMENT</div>
      </div>
    </div>
    <span class="title">PHIẾU LẤY HÀNG</span>
    <div style="min-width:140px;text-align:right">
      <div style="font-size:9px;color:#666">Task #${pickList.taskId ?? pickList.pickingTaskId ?? ''}</div>
      <div style="font-size:9px;color:#666">${now}</div>
    </div>
  </div>
  <hr class="divider"/>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Số đơn:</span><span style="font-weight:700;color:#1a5276">${soCode}</span></div>
    <div class="info-row"><span class="info-label">Task ID:</span><span>#${pickList.taskId ?? pickList.pickingTaskId ?? ''}</span></div>
    <div class="info-row"><span class="info-label">Tổng dòng:</span><span>${items.length} dòng</span></div>
    <div class="info-row"><span class="info-label">Tổng SL:</span><span style="font-weight:700">${totalQty}</span></div>
  </div>

  <div class="notice">
    ⚠️ Lấy hàng theo đúng thứ tự Zone → BIN. Kiểm tra <strong>Số lô</strong> và <strong>HSD</strong> trước khi lấy. Ưu tiên lô có HSD sớm nhất (FEFO).
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">Stt</th>
        <th style="width:7%">Zone</th>
        <th style="width:12%">Vị trí BIN</th>
        <th style="width:8%">Mã hàng</th>
        <th style="width:24%">Tên sản phẩm</th>
        <th style="width:10%">Số lô</th>
        <th style="width:11%">HSD</th>
        <th style="width:7%">SL lấy</th>
        <th style="width:17%">SL thực lấy (Keeper ghi)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="7">Tổng cộng</td>
        <td>${totalQty}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <table class="sig-table">
    <thead>
      <tr>
        <th style="width:22%">Vai trò</th>
        <th style="width:46%">Ký tên xác nhận</th>
        <th style="width:32%">Họ và tên (in hoa)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Keeper</strong><br/><span style="font-size:8px;color:#555">(người lấy &amp; kiểm hàng)</span></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Giám sát / QC</strong><br/><span style="font-size:8px;color:#555">(xác nhận đủ &amp; đúng)</span></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <p class="sig-note">
    Sau khi Keeper ký xong → Scan QR trên hệ thống WMS để chụp ảnh phiếu này và tải lên xác nhận.
  </p>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 600); };
  </script>
</body>
</html>`;
}

export default function PickListPdfButton({ soId, soCode }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const pickList = await fetchPickListByDocument(soId);
      if (!pickList?.items?.length) {
        toast.error('Chưa có Pick List cho đơn này.');
        return;
      }
      const html = buildPickHtml(pickList, soCode);
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Trình duyệt chặn popup. Vui lòng cho phép popup và thử lại.');
        return;
      }
      win.document.write(html);
      win.document.close();
      toast.success('Đang mở phiếu lấy hàng để in / lưu PDF', { id: 'pick-pdf' });
    } catch (err: any) {
      toast.error('Không thể tạo phiếu lấy hàng: ' + (err?.message ?? ''), { id: 'pick-pdf-err' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          Đang tạo phiếu...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[16px]">print</span>
          In phiếu lấy hàng
        </>
      )}
    </button>
  );
}