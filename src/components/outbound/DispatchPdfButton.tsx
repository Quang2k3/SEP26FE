'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { fetchDispatchNote } from '@/services/outboundService';

interface Props {
  soId: number;
  soCode: string;
  existingPdfUrl?: string | null;
}

function buildHtml(note: Awaited<ReturnType<typeof fetchDispatchNote>>, soCode: string): string {
  const dispatchDate = note.dispatchDate
    ? new Date(note.dispatchDate as any).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');

  const items = note.items ?? [];
  let totalQty = 0;

  const itemRows = items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    totalQty += qty;
    return `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center">${item.skuCode ?? ''}</td>
        <td>${item.skuName ?? ''}</td>
        <td></td>
        <td style="text-align:center">${item.unit ?? ''}</td>
        <td style="text-align:center">${qty}</td>
        <td></td>
        <td></td>
        <td style="text-align:center">${item.skuCode ?? ''}</td>
        <td style="text-align:center">${item.lotNumber ?? ''}</td>
        <td style="text-align:center">${item.locationCode ?? ''}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Phiếu Xuất Kho - ${note.dispatchNoteCode ?? soCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Be Vietnam Pro', sans-serif;
      font-size: 11px;
      color: #111;
      background: #fff;
      padding: 16mm 14mm;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      text-align: center;
      flex: 1;
    }
    .divider {
      border: none;
      border-top: 1.5px solid #1a5276;
      margin: 6px 0 10px;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 0;
      margin-bottom: 10px;
    }
    .info-row { display: flex; gap: 6px; }
    .info-label { font-weight: 700; min-width: 80px; white-space: nowrap; }
    .info-value { color: #333; }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10px;
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
      padding: 3px 3px;
      vertical-align: middle;
    }
    .cat-row td {
      background: #f2f3f4;
      font-weight: 700;
      text-align: center;
    }
    .total-row td {
      background: #ebf5fb;
      font-weight: 700;
    }
    .total-row td:nth-child(3) { text-align: center; }
    .total-row td:nth-child(6) { text-align: center; }

    /* Signature */
    .sig-table th { background: #d6eaf8; }
    .sig-table td { height: 28px; }

    /* Print settings */
    @media print {
      @page { size: A4 landscape; margin: 10mm 12mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:8px;min-width:140px">
      <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#6366f1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 96 960 960" fill="white">
          <path d="M80 856V490l400-314 400 314v366H560V676H400v180H80Zm80-80h160V596h320v180h160V534L480 270 160 534v242Zm220-300h40v-80h-40v80Zm0 120h40v-80h-40v80Zm120-120h40v-80h-40v80Zm0 120h40v-80h-40v80ZM480 516Z"/>
        </svg>
      </div>
      <div>
        <div style="font-size:13px;font-weight:800;color:#1a1a2e;letter-spacing:0.3px;line-height:1.1">WMS Portal</div>
        <div style="font-size:8px;color:#6366f1;font-weight:600;letter-spacing:0.5px">WAREHOUSE MANAGEMENT</div>
      </div>
    </div>
    <span class="title">PHIẾU XUẤT KHO</span>
    <span style="min-width:100px"></span>
  </div>
  <hr class="divider"/>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Ngày ĐH:</span><span class="info-value">${dispatchDate}</span></div>
    <div class="info-row"><span class="info-label">Số phiếu:</span><span class="info-value">${note.dispatchNoteCode ?? soCode}</span></div>
    <div class="info-row"><span class="info-label">Kho:</span><span class="info-value">${note.warehouseName ?? ''}</span></div>
    <div class="info-row"><span class="info-label">Tên KH:</span><span class="info-value">${note.customerName ?? ''}</span></div>
    <div class="info-row"><span class="info-label">Người lập:</span><span class="info-value">${note.createdByName ?? ''}</span></div>
    <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value"></span></div>
  </div>

  <table>
    <thead>
      <tr class="cat-row"><td colspan="11">Hàng xuất kho</td></tr>
      <tr>
        <th style="width:4%">Stt</th>
        <th style="width:9%">Mã hàng</th>
        <th style="width:24%">Tên hàng</th>
        <th style="width:5%">Quy cách</th>
        <th style="width:5%">ĐVT</th>
        <th style="width:6%">Thùng</th>
        <th style="width:5%">Chai lẻ</th>
        <th style="width:7%">Ghi chú</th>
        <th style="width:11%">Mã đóng gói</th>
        <th style="width:12%">Số lô</th>
        <th style="width:10%">Vị trí</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="2"></td>
        <td>Tổng cộng</td>
        <td colspan="2"></td>
        <td>${totalQty}</td>
        <td colspan="5"></td>
      </tr>
    </tbody>
  </table>

  <table class="sig-table">
    <thead>
      <tr>
        <th style="width:25%">Nhân sự</th>
        <th style="width:50%">Ký tên xác nhận</th>
        <th style="width:25%">Họ và tên</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Người lập phiếu</td><td></td><td></td></tr>
      <tr><td>Kế toán xác nhận</td><td></td><td></td></tr>
      <tr><td>Người giao hàng</td><td></td><td></td></tr>
      <tr><td>Người nhận hàng</td><td></td><td></td></tr>
    </tbody>
  </table>

  <script>
    // Tự động mở hộp thoại in sau khi font load xong
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  </script>
</body>
</html>`;
}

export default function DispatchPdfButton({ soId, soCode }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const note = await fetchDispatchNote(soId);
      const html = buildHtml(note, soCode);

      // Mở tab mới, viết HTML vào, trigger print dialog
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Trình duyệt chặn popup. Vui lòng cho phép popup và thử lại.', { id: 'pdf-popup' });
        return;
      }
      win.document.write(html);
      win.document.close();

      toast.success('Đang mở phiếu xuất kho để in / lưu PDF', { id: 'pdf-ready' });
    } catch (err: any) {
      console.error('PDF error:', err);
      toast.error('Không thể tạo phiếu xuất kho. Vui lòng thử lại.', { id: 'pdf-error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          Đang tạo phiếu...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
          Xuất phiếu PDF
        </>
      )}
    </button>
  );
}
