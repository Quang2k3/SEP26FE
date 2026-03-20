'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import type {
  PutawayTaskResponse,
  PutawayAllocationResponse,
} from '@/services/putawayService';

interface Props {
  task: PutawayTaskResponse;
  reserved: PutawayAllocationResponse[];
  warehouseName?: string;
  operatorName?: string;
}

function buildHtml(
  task: PutawayTaskResponse,
  reserved: PutawayAllocationResponse[],
  warehouseName?: string,
  operatorName?: string,
): string {
  const now = new Date();
  const printDate = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const printTime = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Group allocations by location for a cleaner table
  const groupedByLocation: Record<
    string,
    { locationCode: string; items: { skuCode: string; skuName: string; qty: number }[] }
  > = {};
  for (const alloc of reserved) {
    if (!groupedByLocation[alloc.locationCode]) {
      groupedByLocation[alloc.locationCode] = {
        locationCode: alloc.locationCode,
        items: [],
      };
    }
    groupedByLocation[alloc.locationCode].items.push({
      skuCode: alloc.skuCode,
      skuName: alloc.skuName,
      qty: alloc.allocatedQty,
    });
  }

  // Flat rows for detailed table (one row per allocation)
  let totalQty = 0;
  const detailRows = reserved
    .map((alloc, idx) => {
      totalQty += alloc.allocatedQty;
      return `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700">${alloc.skuCode}</td>
        <td>${alloc.skuName}</td>
        <td style="text-align:center;font-weight:700;color:#1a5276">${alloc.allocatedQty}</td>
        <td style="text-align:center;font-weight:700;color:#1e8449;font-size:11px">${alloc.locationCode}</td>
      </tr>`;
    })
    .join('');

  // Summary by location rows
  const locationRows = Object.values(groupedByLocation)
    .map((loc, idx) => {
      const skuList = loc.items.map(i => `${i.skuCode} × ${i.qty}`).join(', ');
      const locTotal = loc.items.reduce((s, i) => s + i.qty, 0);
      return `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center;font-weight:800;color:#1e8449;font-size:12px">${loc.locationCode}</td>
        <td>${skuList}</td>
        <td style="text-align:center;font-weight:700">${locTotal}</td>
      </tr>`;
    })
    .join('');

  const grnCode = task.grnCode ?? `GRN-${task.grnId}`;
  const rcvCode = task.receivingCode ?? '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Phiếu Hướng Dẫn Cất Hàng - ${grnCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Be Vietnam Pro', sans-serif;
      font-size: 9.5px;
      color: #111;
      background: #fff;
      padding: 8mm 10mm;
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 160px;
    }
    .logo-box {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-text-main  { font-size: 12px; font-weight: 800; color: #1a1a2e; letter-spacing: 0.3px; line-height: 1.1; }
    .logo-text-sub   { font-size: 7px;  color: #6366f1;  font-weight: 600; letter-spacing: 0.5px; }
    .doc-title {
      flex: 1;
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      color: #1a3050;
      letter-spacing: 0.5px;
    }
    .doc-code-block {
      min-width: 160px;
      text-align: right;
      font-size: 8.5px;
      color: #555;
      line-height: 1.6;
    }
    .doc-code-block strong { color: #1a1a2e; }

    .divider {
      border: none;
      border-top: 2px solid #1a5276;
      margin: 5px 0 8px;
    }
    .divider-thin {
      border: none;
      border-top: 1px dashed #aed6f1;
      margin: 10px 0 8px;
    }

    /* ── Info grid ───────────────────────────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 3px 12px;
      margin-bottom: 10px;
      background: #f4f6fb;
      border: 1px solid #d6eaf8;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .info-row { display: flex; gap: 5px; align-items: baseline; }
    .info-label { font-weight: 700; min-width: 80px; white-space: nowrap; color: #1a5276; }
    .info-value { color: #222; font-weight: 500; }

    /* ── Section heading ─────────────────────────────────────────────────── */
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #1a5276;
      margin-bottom: 5px;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .badge {
      background: #1a5276;
      color: #fff;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 8.5px;
      font-weight: 700;
    }

    /* ── Tables ──────────────────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9.5px;
    }
    th {
      background: #d6eaf8;
      border: 0.5px solid #aed6f1;
      padding: 4px 3px;
      text-align: center;
      font-weight: 700;
      vertical-align: middle;
    }
    td {
      border: 0.5px solid #aed6f1;
      padding: 3px 4px;
      vertical-align: middle;
    }
    tr:nth-child(even) td { background: #f8fbff; }

    .total-row td {
      background: #ebf5fb;
      font-weight: 700;
    }
    .total-row td:last-child { text-align: center; }

    /* ── Location summary box ────────────────────────────────────────────── */
    .location-table th { background: #d5f5e3; border-color: #a9dfbf; }
    .location-table td { border-color: #a9dfbf; }
    .location-table tr:nth-child(even) td { background: #f0faf4; }
    .location-table .total-row td { background: #d5f5e3; }

    /* ── Notice box ──────────────────────────────────────────────────────── */
    .notice {
      background: #fff9e6;
      border: 1px solid #f5cba7;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 8.5px;
      color: #7d6608;
    }
    .notice strong { color: #b7770d; }

    /* ── Signature table ─────────────────────────────────────────────────── */
    .sig-table th { background: #d6eaf8; font-weight: 700; text-align: center; }
    .sig-table td { height: 48px; vertical-align: top; padding: 5px 8px; text-align: center; }

    @media print {
      @page { size: A4; margin: 8mm 10mm; }
      body  { padding: 0; }
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══════════════════════════════════════════════════════════════ -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 96 960 960" fill="white">
          <path d="M80 856V490l400-314 400 314v366H560V676H400v180H80Zm80-80h160V596h320v180h160V534L480 270 160 534v242Zm220-300h40v-80h-40v80Zm0 120h40v-80h-40v80Zm120-120h40v-80h-40v80Zm0 120h40v-80h-40v80ZM480 516Z"/>
        </svg>
      </div>
      <div>
        <div class="logo-text-main">WMS Portal</div>
        <div class="logo-text-sub">WAREHOUSE MANAGEMENT</div>
      </div>
    </div>

    <div class="doc-title">PHIẾU HƯỚNG DẪN CẤT HÀNG VÀO KHO</div>

    <div class="doc-code-block">
      <div><strong>Task #:</strong> ${task.putawayTaskId}</div>
      <div><strong>Ngày in:</strong> ${printDate} ${printTime}</div>
    </div>
  </div>
  <hr class="divider"/>

  <!-- ══ INFO GRID ═══════════════════════════════════════════════════════════ -->
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Mã GRN:</span>
      <span class="info-value" style="font-family:monospace;font-weight:700">${grnCode}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Phiếu nhận:</span>
      <span class="info-value" style="font-family:monospace">${rcvCode || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Kho:</span>
      <span class="info-value">${warehouseName ?? `Kho #${task.warehouseId}`}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Ngày tạo task:</span>
      <span class="info-value">${new Date(task.createdAt).toLocaleDateString('vi-VN')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Nhân viên:</span>
      <span class="info-value">${operatorName ?? '___________________'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Tổng SKU:</span>
      <span class="info-value" style="font-weight:700">${reserved.length} mục / ${Object.keys(groupedByLocation).length} vị trí</span>
    </div>
  </div>

  <!-- ══ NOTICE ═══════════════════════════════════════════════════════════════ -->
  <div class="notice">
    ⚠ <strong>Lưu ý:</strong> Nhân viên phải đưa hàng vào <strong>đúng vị trí BIN</strong> ghi trên phiếu này.
    Kiểm tra mã SKU và số lượng trước khi đặt hàng vào kệ. Sau khi cất xong, cần <strong>xác nhận trên hệ thống</strong> để hoàn tất task.
  </div>

  <!-- ══ DETAIL TABLE ═════════════════════════════════════════════════════════ -->
  <div class="section-title">
    ▸ Chi tiết hàng cần cất &nbsp;<span class="badge">${reserved.length} dòng</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:5%">Stt</th>
        <th style="width:13%">Mã hàng (SKU)</th>
        <th style="width:40%">Tên hàng hoá</th>
        <th style="width:10%">Số lượng</th>
        <th style="width:20%">Vị trí BIN cần đặt</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:10px">Tổng cộng</td>
        <td style="text-align:center">${totalQty}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <hr class="divider-thin"/>

  <!-- ══ LOCATION SUMMARY ═════════════════════════════════════════════════════ -->
  <div class="section-title">
    ▸ Tóm tắt theo vị trí BIN &nbsp;<span class="badge" style="background:#1e8449">${Object.keys(groupedByLocation).length} vị trí</span>
  </div>
  <table class="location-table">
    <thead>
      <tr>
        <th style="width:5%">Stt</th>
        <th style="width:18%">Vị trí BIN</th>
        <th style="width:55%">Hàng đặt vào (SKU × Số lượng)</th>
        <th style="width:12%">Tổng SL</th>
      </tr>
    </thead>
    <tbody>
      ${locationRows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:10px">Tổng cộng</td>
        <td style="text-align:center">${totalQty}</td>
      </tr>
    </tbody>
  </table>

  <!-- ══ SIGNATURE ════════════════════════════════════════════════════════════ -->
  <table class="sig-table" style="margin-top:4px">
    <thead>
      <tr>
        <th style="width:28%">Vai trò</th>
        <th style="width:44%">Ký xác nhận</th>
        <th style="width:28%">Họ và tên</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Người lập phiếu (Hệ thống)</td><td></td><td></td></tr>
      <tr><td>Nhân viên cất hàng</td><td></td><td></td></tr>
      <tr><td>Quản lý kho xác nhận</td><td></td><td></td></tr>
    </tbody>
  </table>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 700);
    };
  </script>
</body>
</html>`;
}

export default function PutawayPdfButton({
  task,
  reserved,
  warehouseName,
  operatorName,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    if (reserved.length === 0) {
      toast.error('Chưa có phân bổ nào để in phiếu');
      return;
    }
    setLoading(true);
    try {
      const html = buildHtml(task, reserved, warehouseName, operatorName);
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Trình duyệt chặn popup. Vui lòng cho phép popup và thử lại.', {
          id: 'putaway-pdf-popup',
        });
        return;
      }
      win.document.write(html);
      win.document.close();
      toast.success('Đang mở phiếu hướng dẫn cất hàng để in / lưu PDF', {
        id: 'putaway-pdf-ready',
      });
    } catch (err) {
      console.error('Putaway PDF error:', err);
      toast.error('Không thể tạo phiếu. Vui lòng thử lại.', { id: 'putaway-pdf-error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading || reserved.length === 0}
      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
      style={{ background: 'linear-gradient(135deg,#1a5276,#2980b9)' }}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Đang tạo phiếu...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          In phiếu hướng dẫn cất hàng
        </>
      )}
    </button>
  );
}
