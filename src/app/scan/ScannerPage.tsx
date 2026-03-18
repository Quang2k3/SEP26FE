'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanMode = 'inbound' | 'outbound_picking' | 'outbound_qc';
type QcCondition = 'PASS' | 'FAIL' | 'HOLD';

interface PickItem {
  taskItemId?: number;
  skuCode: string;
  skuName: string;
  locationCode: string;
  lotNumber?: string;
  barcode?: string;
  requiredQty: number;
}

interface ScanLine {
  skuCode: string;
  skuName: string;
  qty: number;
  condition: string;
  skuId: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/v1', '') ?? '';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return {}; }
}

function getSessionId(token: string): string | null {
  return parseJwt(token)?.sessionId ?? null;
}
function getUserRole(token: string): string {
  const roles: string = parseJwt(token)?.roles ?? '';
  return roles.split(',')[0]?.trim().toUpperCase() ?? 'KEEPER';
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; err: boolean }[]>([]);
  const counter = useRef(0);
  const show = useCallback((msg: string, err = false) => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, msg, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ScannerPage() {
  const params = useSearchParams();
  const token      = params.get('token') ?? '';
  const taskIdStr  = params.get('taskId');
  const modeParam  = params.get('mode') as ScanMode | null;
  const receivingIdStr = params.get('receivingId');

  const mode       = modeParam ?? 'inbound';
  const taskId     = taskIdStr ? Number(taskIdStr) : null;
  const receivingId = receivingIdStr ? Number(receivingIdStr) : null;
  const sessionId  = getSessionId(token);
  const userRole   = getUserRole(token);

  const { toasts, show: toast } = useToast();

  // ── State ──
  const [status, setStatus]         = useState('Đang khởi động camera QR…');
  const [lastCode, setLastCode]     = useState('-');
  const [scanLines, setScanLines]   = useState<Record<string, ScanLine>>({});
  const [pickItems, setPickItems]   = useState<PickItem[]>([]);
  const [scannedQty, setScannedQty] = useState<Record<string, number>>({});
  const [qcCondition, setQcCondition] = useState<QcCondition>('PASS');
  const [failReason, setFailReason] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [locked, setLocked]         = useState(false);
  const [lockedMsg, setLockedMsg]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inflightRef  = useRef(false);
  const lastCodeRef  = useRef('');
  const lastAtRef    = useRef(0);
  const qrRef        = useRef<any>(null);
  const qrRunningRef = useRef(false);

  // Refs so sendBarcode always reads latest values without stale closure
  const pickItemsRef  = useRef<PickItem[]>([]);
  const scannedQtyRef = useRef<Record<string, number>>({});

  // ── Load pick items for outbound_picking ──
  useEffect(() => {
    if (mode !== 'outbound_picking' || !taskId) return;
    fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d?.success) {
          const items = d.data?.items ?? [];
          pickItemsRef.current = items;
          setPickItems(items);
        }
      })
      .catch(() => {});
  }, [mode, taskId, token]);

  // Keep refs in sync with state
  useEffect(() => { pickItemsRef.current = pickItems; }, [pickItems]);
  useEffect(() => { scannedQtyRef.current = scannedQty; }, [scannedQty]);

  // ── Stop QR ──
  const stopQr = useCallback(() => {
    if (qrRef.current && qrRunningRef.current) {
      qrRef.current.stop().catch(() => {});
      qrRunningRef.current = false;
    }
  }, []);

  // ── Lock UI ──
  const lockUI = useCallback((msg: string) => {
    setLocked(true);
    setLockedMsg(msg);
    stopQr();
  }, [stopQr]);

  // ── Send barcode ──
  const sendBarcode = useCallback(async (barcode: string, qty = 1) => {
    if (locked || inflightRef.current) return;

    // outbound_picking: local tracking — use refs for fresh values
    if (mode === 'outbound_picking') {
      const currentItems = pickItemsRef.current;
      const currentQty   = scannedQtyRef.current;

      const matched = currentItems.filter(it =>
        it.skuCode.toUpperCase() === barcode || (it.barcode ?? '').toUpperCase() === barcode
      );
      if (!matched.length) { toast(`Mã ${barcode} không có trong Pick List!`, true); return; }

      let target: { item: PickItem; key: string; req: number; cur: number } | null = null;
      for (let i = 0; i < matched.length; i++) {
        const it = matched[i];
        const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`;
        const req = it.requiredQty;
        const cur = currentQty[key] ?? 0;
        if (cur < req) { target = { item: it, key, req, cur }; break; }
      }
      if (!target) { toast(`Đã đủ số lượng cho ${matched[0].skuCode}`); return; }

      const newCur = target.cur + 1;
      const rem = target.req - newCur;
      // Update ref immediately so next scan reads fresh value
      scannedQtyRef.current = { ...currentQty, [target.key]: newCur };
      setScannedQty({ ...scannedQtyRef.current });
      if (rem > 0) toast(`${target.item.skuCode} ${newCur}/${target.req} (còn ${rem})`);
      else toast(`✅ Đủ rồi! ${target.item.skuCode} ×${target.req}`);
      if (navigator.vibrate) navigator.vibrate(rem <= 0 ? [80, 30, 80] : 80);
      return;
    }

    // inbound / outbound_qc: call API
    const lc = barcode.toLowerCase();
    if (lc.startsWith('http') || lc.includes('//') || barcode.length > 80) {
      setStatus('⚠️ Phát hiện QR/URL — đưa barcode sản phẩm vào khung');
      return;
    }

    inflightRef.current = true;
    setStatus(`Đang gửi: ${barcode}`);
    try {
      const body: any = { barcode, qty, condition: qcCondition };
      if (mode === 'outbound_qc' && taskId) { body.mode = 'outbound_qc'; body.taskId = taskId; }
      if (receivingId) body.receivingId = receivingId;

      const r = await fetch(`${API_BASE}/v1/scan-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d?.success) {
        toast(`✓ ${d.data?.skuCode} — qty: ${d.data?.newQty}`);
        setManualCode('');
        setScanLines(prev => {
          const key = `${d.data.skuCode}_${qcCondition}`;
          const ex = prev[key];
          return { ...prev, [key]: { ...d.data, qty: ex ? ex.qty + (d.data.newQty - ex.qty) : d.data.newQty, condition: qcCondition } };
        });
        if (navigator.vibrate) navigator.vibrate(60);
        // outbound_qc: check allScanned from SSE payload
        if (mode === 'outbound_qc' && d.data?.allScanned) {
          lockUI('✅ QC hoàn tất — tất cả hàng đã kiểm tra');
          toast('✅ QC hoàn tất!');
        }
      } else {
        toast(d?.message ?? 'Lỗi không xác định', true);
      }
    } catch {
      toast('Mất kết nối', true);
    } finally {
      inflightRef.current = false;
      setStatus('Camera sẵn sàng (QR) — đưa QR vào khung');
      setTimeout(() => { inflightRef.current = false; }, 600);
    }
  }, [locked, mode, qcCondition, token, taskId, receivingId, toast, lockUI]); // pickItems/scannedQty via refs

  // ── Start QR Camera ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const proto = window.location.protocol;
    if (proto !== 'https:' && window.location.hostname !== 'localhost') {
      setStatus('Lỗi: Cần HTTPS để truy cập camera'); return;
    }

    let cancelled = false;
    const tryStart = (retries: number) => {
      if ((window as any).Html5Qrcode) {
        if (cancelled) return;
        startCamera();
      } else if (retries > 0) {
        setTimeout(() => tryStart(retries - 1), 200);
      } else {
        setStatus('Lỗi: Không tải được thư viện QR');
      }
    };

    const startCamera = async () => {
      try {
        const Html5Qrcode = (window as any).Html5Qrcode;
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras?.length) { setStatus('Lỗi: Không tìm thấy camera'); return; }
        let camId = cameras[cameras.length - 1].id;
        for (const cam of cameras) {
          const lbl = cam.label.toLowerCase();
          if (lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment')) {
            camId = cam.id; break;
          }
        }
        const qr = new Html5Qrcode('reader');
        qrRef.current = qr;
        await qr.start(camId, { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: 'environment' } },
          (text: string) => {
            const raw = text.trim();
            const lc = raw.toLowerCase();
            if (lc.startsWith('http') || lc.includes('//') || raw.length > 80) return;
            const code = raw.toUpperCase();
            if (code.length < 2) return;
            const now = Date.now();
            if (code === lastCodeRef.current && now - lastAtRef.current < 1500) return;
            lastCodeRef.current = code; lastAtRef.current = now;
            setLastCode(code);
            sendBarcode(code, 1);
          }, () => {}
        );
        qrRunningRef.current = true;
        setStatus('Camera sẵn sàng (QR) — đưa QR vào khung');
      } catch (e: any) {
        setStatus(`Camera lỗi: ${e}`);
      }
    };

    tryStart(25);
    return () => {
      cancelled = true;
      stopQr();
    };
  }, [sendBarcode, stopQr]);

  // ── Close session ──
  const closeSession = async () => {
    if (!sessionId) { toast('Không tìm thấy session', true); return; }
    if (!confirm('Kết thúc phiên scan?')) return;
    await fetch(`${API_BASE}/v1/receiving-sessions/${sessionId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    stopQr();
    lockUI('Phiên scan đã kết thúc');
  };

  // ── Confirm inbound ──
  const confirmInbound = async () => {
    if (!receivingId) { toast('Không có ID phiếu!', true); return; }
    if (!confirm('Xác nhận kiểm đếm xong? Phiếu sẽ gửi cho QC.')) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/receiving-orders/${receivingId}/finalize-count`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d?.success) { toast('✅ Đã gửi QC! QR bị khoá.'); lockUI('Đã gửi QC — Chờ kiểm đếm'); }
      else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  // ── Confirm picked (outbound_picking) ──
  const confirmPicked = async () => {
    if (!taskId) { toast('Không có Task ID!', true); return; }
    if (!confirm('Xác nhận đã lấy đủ toàn bộ hàng? Đơn sẽ chuyển sang bước QC.')) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}/confirm-picked`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      if (d?.success) { toast('✅ Đã gửi QC! Chờ QC kiểm tra hàng.'); lockUI('Keeper đã xác nhận lấy hàng — chờ QC'); }
      else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  // ── Finalize outbound QC ──
  const finalizeQc = async (allPass: boolean) => {
    if (!taskId) { toast('Không tìm thấy Task ID!', true); return; }
    const msg = allPass ? 'Xác nhận tất cả hàng ĐẠT CHUẨN — cho xuất kho?' : 'Xác nhận có hàng KHÔNG ĐẠT?';
    if (!confirm(msg)) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}/finalize-qc`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      if (d?.success) {
        const fc = d.data?.failCount ?? 0;
        const resultMsg = fc > 0 ? `⚠️ ${fc} hàng FAIL — đã ghi nhận` : '✅ QC xác nhận PASS — Keeper có thể xuất kho!';
        if (sessionId) fetch(`${API_BASE}/v1/receiving-sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        toast(resultMsg);
        lockUI('✅ QC hoàn tất — Keeper có thể xuất kho!');
      } else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  // ── Computed ──
  const pickAllDone = pickItems.length > 0 && pickItems.every((it, i) => {
    const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`;
    return (scannedQty[key] ?? 0) >= it.requiredQty;
  });
  const totalScanned = Object.values(scannedQty).reduce((s, v) => s + v, 0);
  const totalRequired = pickItems.reduce((s, it) => s + it.requiredQty, 0);
  const scanLineList = Object.values(scanLines);

  const modeLabel = mode === 'outbound_picking' ? 'CHẾ ĐỘ PICKING' : mode === 'outbound_qc' ? 'CHẾ ĐỘ QC XUẤT KHO' : '';
  const roleColor = userRole === 'QC' ? '#f59e0b' : userRole === 'MANAGER' ? '#a855f7' : '#22c55e';

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg,#1e40af,#1d4ed8)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>📦</span>
        <h1 style={{ fontSize: 17, fontWeight: 700, flex: 1, margin: 0 }}>Warehouse Scanner</h1>
        <span style={{ background: roleColor, color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{userRole}</span>
        <span style={{ background: '#dbeafe', color: '#1e3a8a', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
          {mode === 'outbound_picking' ? `${totalScanned}/${totalRequired}` : `${scanLineList.length} dòng`}
        </span>
      </header>

      <div style={{ padding: 12, maxWidth: 520, margin: '0 auto' }}>
        {/* Camera */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '2px solid #3b82f6', background: '#111', marginBottom: 8 }}>
          <div id="reader" style={{ width: '100%' }} />
          <div style={{ position: 'absolute', left: '8%', right: '8%', height: 2, background: 'linear-gradient(90deg,transparent,#34d399,transparent)', top: '50%', animation: 'scan 1.8s ease-in-out infinite', pointerEvents: 'none', zIndex: 10 }} />
        </div>
        <div style={{ background: '#1e293b', color: '#94a3b8', fontSize: 11, padding: '6px 12px', textAlign: 'center', borderRadius: '0 0 12px 12px', marginBottom: 8 }}>{status}</div>

        {/* Mode indicator */}
        {modeLabel && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, fontWeight: 600 }}>
              QUÉT QR <span style={{ color: '#f59e0b', fontWeight: 700 }}>({modeLabel})</span>
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
              Đưa mã QR vào khung. Nếu không quét được, kéo xuống nhập mã SKU bằng tay.
            </p>
            <p style={{ fontSize: 12, margin: '8px 0 0', color: '#94a3b8' }}>Mã vừa quét: <strong style={{ color: '#e2e8f0' }}>{lastCode}</strong></p>
          </div>
        )}

        {/* QC condition toggle */}
        {mode === 'outbound_qc' && !locked && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['PASS', 'FAIL', 'HOLD'] as QcCondition[]).map(c => (
              <button key={c} onClick={() => setQcCondition(c)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `2px solid ${qcCondition === c ? (c === 'PASS' ? '#10b981' : c === 'FAIL' ? '#ef4444' : '#f59e0b') : '#334155'}`, background: qcCondition === c ? (c === 'PASS' ? 'rgba(16,185,129,.1)' : c === 'FAIL' ? 'rgba(239,68,68,.1)' : 'rgba(245,158,11,.1)') : 'transparent', color: qcCondition === c ? (c === 'PASS' ? '#10b981' : c === 'FAIL' ? '#ef4444' : '#f59e0b') : '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Manual input */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, fontWeight: 600, margin: '0 0 10px' }}>NHẬP THỦ CÔNG (FALLBACK)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={manualCode} onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manualCode.trim() && sendBarcode(manualCode.trim().toUpperCase())}
              placeholder="SKU Code (ví dụ: 0001-1012)" autoCapitalize="characters" autoComplete="off"
              style={{ flex: 1, padding: '11px 14px', background: '#0f172a', border: '1.5px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 16, WebkitAppearance: 'none' }} />
          </div>
          <button onClick={() => manualCode.trim() && sendBarcode(manualCode.trim().toUpperCase())} disabled={!manualCode.trim()}
            style={{ marginTop: 10, width: '100%', padding: '12px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: '#3b82f6', color: '#fff', opacity: manualCode.trim() ? 1 : 0.5 }}>
            Scan
          </button>
        </div>

        {/* Scanned lines (inbound / outbound_qc) */}
        {mode !== 'outbound_picking' && scanLineList.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, fontWeight: 600, margin: '0 0 10px' }}>ĐÃ SCAN (PHIÊN HIỆN TẠI)</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={{ textAlign: 'left', color: '#475569', padding: '5px 4px', fontSize: 11, fontWeight: 600 }}>SKU</th>
                <th style={{ textAlign: 'left', color: '#475569', padding: '5px 4px', fontSize: 11, fontWeight: 600 }}>Tên sản phẩm</th>
                <th style={{ textAlign: 'center', color: '#475569', padding: '5px 4px', fontSize: 11, fontWeight: 600 }}>TT</th>
                <th style={{ textAlign: 'right', color: '#475569', padding: '5px 4px', fontSize: 11, fontWeight: 600 }}>Qty</th>
              </tr></thead>
              <tbody>
                {scanLineList.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #263347' }}>
                    <td style={{ padding: '9px 4px', color: '#94a3b8', fontSize: 11 }}>{l.skuCode}</td>
                    <td style={{ padding: '9px 4px' }}>{l.skuName}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 800, background: l.condition === 'FAIL' ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)', color: l.condition === 'FAIL' ? '#ef4444' : '#22c55e' }}>
                        {l.condition}
                      </span>
                    </td>
                    <td style={{ padding: '9px 4px', textAlign: 'right', fontWeight: 800, color: '#34d399', fontSize: 15 }}>{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Picking list */}
        {mode === 'outbound_picking' && pickItems.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, fontWeight: 700, margin: '0 0 10px' }}>📋 PICKING — XÁC NHẬN LẤY HÀNG</p>
            {pickItems.map((it, i) => {
              const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`;
              const cur = scannedQty[key] ?? 0;
              const done = cur >= it.requiredQty;
              return (
                <div key={key} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: done ? 'rgba(16,185,129,.08)' : '#0f172a', borderLeft: `3px solid ${done ? '#10b981' : '#334155'}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{it.skuCode}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{it.skuName} · {it.locationCode}{it.lotNumber ? ` · ${it.lotNumber}` : ''}{it.barcode ? ` · ${it.barcode}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#60a5fa' }}>×{it.requiredQty}</div>
                    {done
                      ? <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ ĐÃ LẤY</div>
                      : <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>{cur}/{it.requiredQty} quét</div>}
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>
              {totalScanned}/{totalRequired} sản phẩm đã quét.{pickAllDone ? ' Sẵn sàng gửi QC!' : ''}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!locked && (
          <div style={{ marginBottom: 8 }}>
            {/* Inbound keeper */}
            {mode === 'inbound' && receivingId && (
              <button onClick={confirmInbound} disabled={submitting}
                style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Đang gửi...' : '✅ Xác nhận kiểm đếm — Gửi QC'}
              </button>
            )}

            {/* Outbound picking */}
            {mode === 'outbound_picking' && (
              <button onClick={confirmPicked} disabled={!pickAllDone || submitting}
                style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', marginBottom: 8, opacity: (!pickAllDone || submitting) ? 0.5 : 1 }}>
                {submitting ? 'Đang gửi...' : 'Gửi sang QC — Đã lấy đủ hàng'}
              </button>
            )}

            {/* Outbound QC */}
            {mode === 'outbound_qc' && (
              <>
                <button onClick={() => finalizeQc(true)} disabled={submitting}
                  style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Đang gửi...' : '✅ Xác nhận — Tất cả PASS (Cho xuất kho)'}
                </button>
                <button onClick={() => finalizeQc(false)} disabled={submitting}
                  style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: '#ef4444', color: '#fff', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
                  Báo có hàng FAIL / HOLD
                </button>
              </>
            )}
          </div>
        )}

        {/* Locked overlay */}
        {locked && (
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(71,85,105,.3)', borderRadius: 10, marginBottom: 8, border: '1px solid #334155' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, margin: 0 }}>{lockedMsg}</p>
          </div>
        )}

        {/* Close button */}
        <div style={{ marginBottom: 8 }}>
          <button onClick={closeSession}
            style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: '#ef4444', color: '#fff' }}>
            🛑 Kết thúc Scan
          </button>
        </div>
      </div>

      {/* Toasts */}
      {toasts.map(t => (
        <div key={t.id} style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: t.err ? '#ef4444' : '#10b981', color: '#fff', padding: '11px 24px', borderRadius: 28, fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,.5)', zIndex: 9999, pointerEvents: 'none' }}>
          {t.msg}
        </div>
      ))}

      <style>{`
        @keyframes scan { 0%,100%{top:20%} 50%{top:80%} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #3b82f6 !important; }
        button { transition: opacity .15s; }
      `}</style>

      {/* Load html5-qrcode via next/script */}
      <Script
        src={`${API_BASE}/js/html5-qrcode.min.js`}
        strategy="afterInteractive"
        onReady={() => { /* html5-qrcode loaded */ }}
      />
    </div>
  );
}
