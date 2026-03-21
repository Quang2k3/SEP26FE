'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';

type ScanMode = 'inbound' | 'outbound_picking' | 'outbound_qc';
type QcCondition = 'PASS' | 'FAIL' | 'HOLD';

interface InboundExpectedItem {
  receivingItemId: number;
  skuCode: string;
  skuName: string;
  expectedQty: number;
  receivedQty: number;
  lotNumber: string | null;
}
interface ScanLine { skuCode: string; skuName: string; qty: number; condition: string; skuId: number; }
interface PickItem { taskItemId?: number; skuCode: string; skuName: string; locationCode: string; lotNumber?: string; barcode?: string; requiredQty: number; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/v1', '') ?? '';

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return {}; }
}
function getSessionId(t: string): string | null { return parseJwt(t)?.sessionId ?? null; }
function getUserRole(t: string): string {
  const roles: string = parseJwt(t)?.roles ?? '';
  return roles.split(',')[0]?.trim().toUpperCase() ?? 'KEEPER';
}

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

function ToastOverlay({ toasts }: { toasts: { id: number; msg: string; err: boolean }[] }) {
  return <>{toasts.map(t => (
    <div key={t.id} style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: t.err ? '#ef4444' : '#10b981', color: '#fff', padding: '11px 24px', borderRadius: 28, fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,.5)', zIndex: 9999, pointerEvents: 'none' }}>
      {t.msg}
    </div>
  ))}</>;
}

function CameraSection({ status, manualCode, onManualChange, onManualScan, accentColor = '#3b82f6' }: {
  status: string; manualCode: string; onManualChange: (v: string) => void; onManualScan: () => void; accentColor?: string;
}) {
  return (
    <>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: `2px solid ${accentColor}`, background: '#111', marginBottom: 8 }}>
        <div id="reader" style={{ width: '100%' }} />
        <div style={{ position: 'absolute', left: '8%', right: '8%', height: 2, background: 'linear-gradient(90deg,transparent,#34d399,transparent)', top: '50%', animation: 'scan 1.8s ease-in-out infinite', pointerEvents: 'none', zIndex: 10 }} />
      </div>
      <div style={{ background: '#1e293b', color: '#94a3b8', fontSize: 11, padding: '6px 12px', textAlign: 'center', borderRadius: '0 0 12px 12px', marginBottom: 8 }}>{status}</div>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
        <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, margin: '0 0 10px' }}>Nhập thủ công (fallback)</p>
        <input value={manualCode} onChange={e => onManualChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && manualCode.trim() && onManualScan()}
          placeholder="SKU Code (ví dụ: SKU001)" autoCapitalize="characters" autoComplete="off"
          style={{ width: '100%', padding: '11px 14px', background: '#0f172a', border: '1.5px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 16, WebkitAppearance: 'none', boxSizing: 'border-box' }} />
        <button onClick={onManualScan} disabled={!manualCode.trim()}
          style={{ marginTop: 10, width: '100%', padding: '12px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: accentColor, color: '#fff', opacity: manualCode.trim() ? 1 : 0.5 }}>
          Scan
        </button>
      </div>
    </>
  );
}

function LockedOverlay({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 16, background: 'rgba(71,85,105,.3)', borderRadius: 10, marginBottom: 8, border: '1px solid #334155' }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
      <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, margin: 0 }}>{msg}</p>
    </div>
  );
}

function useCamera(onCode: (code: string) => void, setStatus: (s: string) => void) {
  const qrRef = useRef<any>(null);
  const qrRunning = useRef(false);
  const lastCodeRef = useRef('');
  const lastAtRef = useRef(0);

  const stopQr = useCallback(() => {
    if (qrRef.current && qrRunning.current) { qrRef.current.stop().catch(() => {}); qrRunning.current = false; }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const tryStart = (retries: number) => {
      if ((window as any).Html5Qrcode) { if (!cancelled) startCam(); }
      else if (retries > 0) setTimeout(() => tryStart(retries - 1), 200);
      else setStatus('Không tải được thư viện QR');
    };
    const startCam = async () => {
      try {
        const Html5Qrcode = (window as any).Html5Qrcode;
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras?.length) { setStatus('Không tìm thấy camera'); return; }
        let camId = cameras[cameras.length - 1].id;
        for (const cam of cameras) { if (cam.label.toLowerCase().match(/back|rear|environment/)) { camId = cam.id; break; } }
        const qr = new Html5Qrcode('reader'); qrRef.current = qr;
        await qr.start(camId, { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: 'environment' } },
          (text: string) => {
            const raw = text.trim();
            if (!raw) return;
            if (raw.includes('/v1/scan') && raw.includes('token=')) return;
            let code = raw;
            if (raw.toLowerCase().startsWith('http://') || raw.toLowerCase().startsWith('https://')) {
              try {
                const url = new URL(raw);
                const skuParam = url.searchParams.get('sku') ?? url.searchParams.get('skuCode')
                  ?? url.searchParams.get('code') ?? url.searchParams.get('barcode');
                if (skuParam && skuParam.trim().length >= 2) {
                  code = skuParam.trim();
                } else {
                  const segments = url.pathname.split('/').filter(Boolean);
                  const last = segments[segments.length - 1] ?? '';
                  if (!last || last.length < 2) return;
                  code = decodeURIComponent(last);
                }
              } catch { return; }
            }
            const finalCode = code.toUpperCase();
            if (finalCode.length < 2) return;
            const now = Date.now();
            if (finalCode === lastCodeRef.current && now - lastAtRef.current < 1500) return;
            lastCodeRef.current = finalCode; lastAtRef.current = now; onCode(finalCode);
          }, () => {});
        qrRunning.current = true; setStatus('Camera sẵn sàng — đưa barcode vào khung');
      } catch (e: any) { setStatus(`Camera lỗi: ${e}`); }
    };
    tryStart(25);
    return () => { cancelled = true; stopQr(); };
  }, [onCode, setStatus, stopQr]);

  return { stopQr };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. KEEPER INBOUND
// ─────────────────────────────────────────────────────────────────────────────
function KeeperInboundScanner({ token, receivingId }: { token: string; receivingId: number }) {
  const { toasts, show: toast } = useToast();
  const [status, setStatus]       = useState('Đang khởi động camera...');
  const [manualCode, setManualCode] = useState('');
  const [locked, setLocked]       = useState(false);
  const [lockedMsg, setLockedMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expectedItems, setExpectedItems] = useState<InboundExpectedItem[]>([]);
  const [scannedMap, setScannedMap] = useState<Record<string, number>>({});
  const [skuIdMap, setSkuIdMap]   = useState<Record<string, number>>({});

  const inflightRef = useRef(false);
  const scannedRef  = useRef<Record<string, number>>({});
  const sessionId   = getSessionId(token);
  useEffect(() => { scannedRef.current = scannedMap; }, [scannedMap]);

  useEffect(() => {
    fetch(`${API_BASE}/v1/receiving-orders/${receivingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d?.success) setExpectedItems(d.data?.items ?? []); }).catch(() => {});
  }, [receivingId, token]);

  const lockUI = useCallback((msg: string) => { setLocked(true); setLockedMsg(msg); }, []);

  const scanBarcode = useCallback(async (barcode: string) => {
    if (locked || inflightRef.current) return;
    inflightRef.current = true;
    setStatus(`Đang gửi: ${barcode}`);
    try {
      const r = await fetch(`${API_BASE}/v1/scan-events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barcode, qty: 1, condition: 'PASS', receivingId }),
      });
      const d = await r.json();
      if (d?.success) {
        const sku = d.data?.skuCode ?? barcode; const newQty = d.data?.newQty ?? 1;
        const skuId: number = d.data?.skuId ?? 0;
        setScannedMap(prev => ({ ...prev, [sku]: newQty }));
        setSkuIdMap(prev => ({ ...prev, [sku]: skuId }));
        toast(`✓ ${sku} — tổng: ${newQty}`);
        if (navigator.vibrate) navigator.vibrate(60);
      } else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Mất kết nối', true); }
    finally { inflightRef.current = false; setStatus('Camera sẵn sàng'); setTimeout(() => { inflightRef.current = false; }, 600); }
  }, [locked, token, receivingId, toast]);

  const decrementSku = useCallback(async (skuCode: string) => {
    if (locked || inflightRef.current) return;
    if ((scannedRef.current[skuCode] ?? 0) <= 0) { toast('Số lượng đã về 0', true); return; }
    if (!sessionId) { toast('Không tìm thấy session', true); return; }
    const skuId = skuIdMap[skuCode] ?? 0;
    if (!skuId) { toast('Không tìm thấy SKU ID', true); return; }
    inflightRef.current = true;
    try {
      const params = new URLSearchParams({ sessionId, skuId: String(skuId), condition: 'PASS', qty: '1', receivingId: String(receivingId) });
      const r = await fetch(`${API_BASE}/v1/scan-events?${params}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d?.success || r.status === 200) {
        const newQty = Math.max(0, (scannedRef.current[skuCode] ?? 1) - 1);
        setScannedMap(prev => ({ ...prev, [skuCode]: newQty }));
        toast(`↩ ${skuCode} — tổng: ${newQty}`);
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      } else toast(d?.message ?? 'Lỗi khi trừ', true);
    } catch { toast('Mất kết nối', true); }
    finally { inflightRef.current = false; }
  }, [locked, token, receivingId, sessionId, skuIdMap, toast]);

  const { stopQr } = useCamera(scanBarcode, setStatus);

  const confirmFinalize = async () => {
    if (!window.confirm('Xác nhận kiểm đếm xong?\nNếu số lượng khớp → gửi QC.\nNếu chênh lệch hoặc có hàng ngoài phiếu → gửi Manager duyệt.')) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/receiving-orders/${receivingId}/finalize-count`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d?.success) {
        const orderStatus = d.data?.status;
        const apiMsg = d.message ?? '';
        if (apiMsg.includes('khớp QC') && apiMsg.includes('tự xử lý')) {
          if (orderStatus === 'PENDING_INCIDENT') {
            toast('✅ Khớp QC! Phát hiện sai lệch — đã tạo Incident');
            lockUI('Khớp QC ✓ — Incident gửi Manager duyệt');
          } else {
            toast('✅ Khớp QC! Hàng đã duyệt');
            lockUI('Khớp QC ✓ — QC Approved');
          }
        } else if (apiMsg.includes('vẫn lệch QC')) {
          toast('⚠️ Vẫn lệch với QC — chờ QC quét lại');
          lockUI('⚠️ Lệch QC — chờ QC kiểm đếm lại');
        } else if (orderStatus === 'PENDING_INCIDENT') {
          const hasUnexpected = apiMsg.includes('ngoài phiếu');
          const hasMismatch = apiMsg.includes('chênh lệch');
          let toastMsg = '⚠️ ';
          let lockMsg = '';
          if (hasUnexpected && hasMismatch) {
            toastMsg += 'Phát hiện hàng ngoài phiếu + chênh lệch số lượng — gửi Manager';
            lockMsg = '⚠️ Hàng ngoài phiếu + chênh lệch — chờ Manager xử lý';
          } else if (hasUnexpected) {
            toastMsg += 'Phát hiện hàng ngoài phiếu — gửi Manager duyệt';
            lockMsg = '⚠️ Hàng ngoài phiếu — chờ Manager xử lý';
          } else {
            toastMsg += 'Chênh lệch số lượng — gửi Manager duyệt';
            lockMsg = '⚠️ Thừa/thiếu — chờ Manager xử lý';
          }
          toast(toastMsg);
          lockUI(lockMsg);
        } else {
          toast('✅ Đã gửi QC!');
          lockUI('Đã gửi QC — chờ kiểm tra chất lượng');
        }
      }
      else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  const totalExp  = expectedItems.reduce((s, i) => s + i.expectedQty, 0);
  const totalScan = expectedItems.reduce((s, i) => s + (scannedMap[i.skuCode] ?? i.receivedQty), 0);
  const allDone   = expectedItems.length > 0 && expectedItems.every(i => (scannedMap[i.skuCode] ?? i.receivedQty) >= i.expectedQty);
  const hasOver   = expectedItems.some(i => (scannedMap[i.skuCode] ?? 0) > i.expectedQty);
  const expectedSkuSet = new Set(expectedItems.map(i => i.skuCode));
  const extraSkus = Object.entries(scannedMap).filter(([sku, qty]) => !expectedSkuSet.has(sku) && qty > 0);

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>📥</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nhận hàng</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', margin: 0 }}>Keeper · Phiếu #{receivingId}</p>
        </div>
        <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{totalScan}/{totalExp}</span>
      </header>

      <div style={{ padding: 12, maxWidth: 520, margin: '0 auto' }}>
        <CameraSection status={status} manualCode={manualCode} onManualChange={setManualCode}
          onManualScan={() => { manualCode.trim() && scanBarcode(manualCode.trim().toUpperCase()); setManualCode(''); }}
          accentColor="#22c55e" />

        {expectedItems.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, margin: 0 }}>📋 Danh sách nhận hàng</p>
              <span style={{ fontSize: 11, color: allDone ? '#10b981' : '#94a3b8', fontWeight: 700 }}>{allDone ? '✓ Hoàn tất' : `${totalScan}/${totalExp}`}</span>
            </div>
            {expectedItems.map(item => {
              const scanned = scannedMap[item.skuCode] ?? item.receivedQty;
              const done    = scanned >= item.expectedQty;
              const over    = scanned > item.expectedQty;
              const pct     = item.expectedQty > 0 ? Math.min(100, Math.round(scanned / item.expectedQty * 100)) : 0;
              const barColor = over ? '#f97316' : done ? '#10b981' : scanned > 0 ? '#f59e0b' : '#334155';
              return (
                <div key={item.receivingItemId} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, background: over ? 'rgba(249,115,22,.08)' : done ? 'rgba(16,185,129,.08)' : '#0f172a', borderLeft: `3px solid ${barColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{item.skuCode}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.skuName}</p>
                      {item.lotNumber && <p style={{ fontSize: 10, color: '#475569', margin: '2px 0 0' }}>LOT: {item.lotNumber}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {scanned > 0 && !locked && (
                        <button onClick={() => decrementSku(item.skuCode)}
                          style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #475569', background: 'transparent', color: '#f97316', fontSize: 22, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                          −
                        </button>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: over ? '#f97316' : done ? '#10b981' : scanned > 0 ? '#f59e0b' : '#60a5fa', margin: 0 }}>
                          {scanned}<span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>/{item.expectedQty}</span>
                        </p>
                        <p style={{ fontSize: 10, margin: 0, color: over ? '#f97316' : done ? '#10b981' : '#94a3b8', fontWeight: over || done ? 700 : 400 }}>
                          {over ? `+${scanned - item.expectedQty} thừa` : done ? '✓ Đủ' : `Còn ${item.expectedQty - scanned}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, height: 3, background: '#1e3a5f', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, transition: 'width .3s', width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
            {hasOver && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(249,115,22,.12)', borderRadius: 8, border: '1px solid rgba(124,45,18,.5)', fontSize: 11, color: '#fb923c' }}>
                ⚠️ Một số SKU quét thừa — bấm − để điều chỉnh trước khi xác nhận.
              </div>
            )}
          </div>
        )}

        {extraSkus.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, border: '1px solid rgba(249,115,22,.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, margin: 0 }}>⚠️ Hàng ngoài phiếu</p>
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{extraSkus.length} SKU</span>
            </div>
            {extraSkus.map(([skuCode, qty]) => (
              <div key={skuCode} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, background: 'rgba(249,115,22,.06)', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{skuCode}</p>
                    <p style={{ fontSize: 10, color: '#f59e0b', margin: '2px 0 0', fontWeight: 600 }}>Không có trên phiếu nhận</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {!locked && (
                      <button onClick={() => decrementSku(skuCode)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #475569', background: 'transparent', color: '#f97316', fontSize: 22, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                        −
                      </button>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', margin: 0 }}>{qty}</p>
                      <p style={{ fontSize: 10, margin: 0, color: '#f59e0b', fontWeight: 600 }}>NGOÀI PHIẾU</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!locked && (
          <button onClick={confirmFinalize} disabled={submitting}
            style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Đang gửi...' : '✅ Xác nhận kiểm đếm — Gửi QC'}
          </button>
        )}
        {locked && <LockedOverlay msg={lockedMsg} />}
        <button onClick={() => { stopQr(); lockUI('Phiên scan đã kết thúc'); }}
          style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: '#ef4444', color: '#fff', marginBottom: 8 }}>
          🛑 Kết thúc Scan
        </button>
      </div>
      <ToastOverlay toasts={toasts} />
      <style>{`@keyframes scan{0%,100%{top:20%}50%{top:80%}}*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none;border-color:#22c55e!important}button{transition:opacity .15s}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. QC INBOUND
// ─────────────────────────────────────────────────────────────────────────────
function QCInboundScanner({ token, receivingId }: { token: string; receivingId: number }) {
  const { toasts, show: toast } = useToast();
  const [status, setStatus]         = useState('Đang khởi động camera...');
  const [manualCode, setManualCode] = useState('');
  const [locked, setLocked]         = useState(false);
  const [lockedMsg, setLockedMsg]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qcCondition, setQcCondition] = useState<QcCondition>('PASS');
  const [expectedItems, setExpectedItems] = useState<InboundExpectedItem[]>([]);
  const [qcMap, setQcMap] = useState<Record<string, { pass: number; fail: number; hold: number; skuId: number }>>({});

  const inflightRef  = useRef(false);
  const conditionRef = useRef<QcCondition>('PASS');
  const sessionId    = getSessionId(token);
  useEffect(() => { conditionRef.current = qcCondition; }, [qcCondition]);

  useEffect(() => {
    fetch(`${API_BASE}/v1/receiving-orders/${receivingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d?.success) setExpectedItems(d.data?.items ?? []); }).catch(() => {});
  }, [receivingId, token]);

  const lockUI = useCallback((msg: string) => { setLocked(true); setLockedMsg(msg); }, []);
  const toApiCondition = (c: QcCondition) => c === 'HOLD' ? 'FAIL' : c;

  const scanBarcode = useCallback(async (barcode: string) => {
    if (locked || inflightRef.current) return;
    inflightRef.current = true;
    const cond = conditionRef.current;
    setStatus(`Gửi: ${barcode} [${cond}]`);
    try {
      // QC scan inbound: KHÔNG gửi receivingId trong body → chỉ lưu vào Redis session.
      // Nếu gửi receivingId, ScanEventService sẽ cộng vào receivedQty trong DB ngay lập tức
      // → gây lệch số khi qcSubmitSession so sánh kết quả QC vs Keeper scan.
      // receivingId chỉ được dùng để gọi qc-submit-session ở bước finalize.
      const body: Record<string, unknown> = {
        barcode,
        qty: 1,
        condition: toApiCondition(cond),
      };
      if (cond === 'HOLD') body.reasonCode = 'HOLD';
      const r = await fetch(`${API_BASE}/v1/scan-events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d?.success) {
        const sku = d.data?.skuCode ?? barcode;
        const skuId: number = d.data?.skuId ?? 0;
        setQcMap(prev => {
          const c = prev[sku] ?? { pass: 0, fail: 0, hold: 0, skuId };
          return { ...prev, [sku]: { ...c, skuId, [cond.toLowerCase()]: c[cond.toLowerCase() as 'pass'|'fail'|'hold'] + 1 } };
        });
        const icon = cond === 'PASS' ? '✓' : cond === 'FAIL' ? '✗' : '⏸';
        toast(`${icon} ${sku} [${cond}]`);
        if (navigator.vibrate) navigator.vibrate(cond === 'FAIL' ? [80, 30, 80] : 60);
      } else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Mất kết nối', true); }
    finally { inflightRef.current = false; setStatus('Camera sẵn sàng'); setTimeout(() => { inflightRef.current = false; }, 600); }
  }, [locked, token, receivingId, toast]);

  const decrementSku = useCallback(async (skuCode: string) => {
    if (locked || inflightRef.current) return;
    const cond    = conditionRef.current;
    const entry   = qcMap[skuCode];
    const curQty  = entry?.[cond.toLowerCase() as 'pass'|'fail'|'hold'] ?? 0;
    if (curQty <= 0) { toast(`Không có ${cond} nào để trừ`, true); return; }
    if (!sessionId)  { toast('Không tìm thấy session', true); return; }
    const skuId   = entry?.skuId ?? 0;
    if (!skuId)      { toast('Không tìm thấy SKU ID', true); return; }
    inflightRef.current = true;
    try {
      const apiCond = toApiCondition(cond);
      const params  = new URLSearchParams({ sessionId, skuId: String(skuId), condition: apiCond, qty: '1' });
      const r = await fetch(`${API_BASE}/v1/scan-events?${params}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d?.success || r.status === 200) {
        setQcMap(prev => {
          const c = prev[skuCode] ?? { pass: 0, fail: 0, hold: 0, skuId };
          const newVal = Math.max(0, c[cond.toLowerCase() as 'pass'|'fail'|'hold'] - 1);
          return { ...prev, [skuCode]: { ...c, [cond.toLowerCase()]: newVal } };
        });
        toast(`↩ ${skuCode} [${cond}] −1`);
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      } else toast(d?.message ?? 'Lỗi khi trừ', true);
    } catch { toast('Mất kết nối', true); }
    finally { inflightRef.current = false; }
  }, [locked, token, receivingId, sessionId, qcMap, toast]);

  const { stopQr } = useCamera(scanBarcode, setStatus);

  const confirmQC = async () => {
    if (!sessionId) { toast('Không tìm thấy session ID', true); return; }
    const hasFail = Object.values(qcMap).some(v => v.fail > 0 || v.hold > 0);
    const msg = hasFail ? 'Có hàng FAIL/HOLD. Xác nhận gửi báo cáo QC?' : 'Xác nhận tất cả hàng PASS — Gửi duyệt?';
    if (!window.confirm(msg)) return;
    setSubmitting(true);
    try {
      const r = await fetch(
        `${API_BASE}/v1/receiving-orders/${receivingId}/qc-submit-session?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      if (d?.success) {
        const resData = d.data;
        if (resData?.matched === false && resData?.status === 'KEEPER_RESCAN') {
          const mismatchCount = resData.mismatchCount ?? 0;
          toast(`⚠️ Lệch ${mismatchCount} SKU với Keeper — yêu cầu Keeper quét lại`);
          lockUI(`⚠️ Lệch ${mismatchCount} SKU — chờ Keeper quét lại`);
        } else if (resData?.status === 'PENDING_INCIDENT') {
          toast('⚠️ QC phát hiện sai lệch — Incident gửi Manager');
          lockUI('⚠️ Đã tạo Incident — chờ Manager duyệt');
        } else {
          toast('✅ QC hoàn tất!');
          lockUI('QC đã xác nhận — phiếu chuyển duyệt');
        }
      }
      else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  const totalScanned = Object.values(qcMap).reduce((s, v) => s + v.pass + v.fail + v.hold, 0);
  const totalFail    = Object.values(qcMap).reduce((s, v) => s + v.fail, 0);
  const totalHold    = Object.values(qcMap).reduce((s, v) => s + v.hold, 0);
  const totalPass    = totalScanned - totalFail - totalHold;
  const condClr      = qcCondition === 'PASS' ? '#10b981' : qcCondition === 'FAIL' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(135deg,#b45309,#92400e)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🔍</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Kiểm định chất lượng</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', margin: 0 }}>QC · Phiếu #{receivingId}</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ background: 'rgba(16,185,129,.3)', color: '#6ee7b7', borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{totalPass}P</span>
          {totalFail > 0 && <span style={{ background: 'rgba(239,68,68,.3)', color: '#fca5a5', borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{totalFail}F</span>}
          {totalHold > 0 && <span style={{ background: 'rgba(245,158,11,.3)', color: '#fcd34d', borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{totalHold}H</span>}
        </div>
      </header>

      <div style={{ padding: 12, maxWidth: 520, margin: '0 auto' }}>
        {!locked && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['PASS', 'FAIL', 'HOLD'] as QcCondition[]).map(c => {
                const clr = c === 'PASS' ? '#10b981' : c === 'FAIL' ? '#ef4444' : '#f59e0b';
                const active = qcCondition === c;
                return (
                  <button key={c} onClick={() => setQcCondition(c)}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${active ? clr : '#334155'}`, background: active ? `rgba(${c==='PASS'?'16,185,129':c==='FAIL'?'239,68,68':'245,158,11'},.15)` : 'transparent', color: active ? clr : '#475569', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    {c}
                  </button>
                );
              })}
            </div>
            <div style={{ background: `rgba(${qcCondition==='PASS'?'16,185,129':qcCondition==='FAIL'?'239,68,68':'245,158,11'},.08)`, border: `1px solid ${condClr}33`, borderRadius: 10, padding: '7px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: condClr, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: condClr, fontWeight: 700 }}>Chế độ scan: {qcCondition}</span>
              <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>Nút − sẽ trừ đúng loại này</span>
            </div>
          </>
        )}

        <CameraSection status={status} manualCode={manualCode} onManualChange={setManualCode}
          onManualScan={() => { manualCode.trim() && scanBarcode(manualCode.trim().toUpperCase()); setManualCode(''); }}
          accentColor={condClr} />

        {expectedItems.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, margin: '0 0 10px' }}>🔍 Kết quả kiểm định</p>
            {expectedItems.map(item => {
              const qc      = qcMap[item.skuCode] ?? { pass: 0, fail: 0, hold: 0 };
              const total   = qc.pass + qc.fail + qc.hold;
              const done    = total >= item.expectedQty;
              const hasIssue = qc.fail > 0 || qc.hold > 0;
              const curCond  = qc[qcCondition.toLowerCase() as 'pass'|'fail'|'hold'];
              return (
                <div key={item.receivingItemId} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, background: hasIssue ? 'rgba(239,68,68,.06)' : done ? 'rgba(16,185,129,.06)' : '#0f172a', borderLeft: `3px solid ${hasIssue ? '#ef4444' : done ? '#10b981' : '#334155'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{item.skuCode}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.skuName}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {qc.pass > 0 && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {qc.pass} Pass</span>}
                        {qc.fail > 0 && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>✗ {qc.fail} Fail</span>}
                        {qc.hold > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⏸ {qc.hold} Hold</span>}
                        {total === 0 && <span style={{ fontSize: 11, color: '#475569' }}>Chưa scan</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {curCond > 0 && !locked && (
                        <button onClick={() => decrementSku(item.skuCode)} title={`-1 ${qcCondition}`}
                          style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #475569', background: 'transparent', color: '#f97316', fontSize: 22, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          −
                        </button>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: hasIssue ? '#ef4444' : done ? '#10b981' : '#60a5fa', margin: 0 }}>
                          {total}<span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>/{item.expectedQty}</span>
                        </p>
                        <p style={{ fontSize: 10, margin: 0, color: done ? '#10b981' : '#94a3b8' }}>
                          {done ? '✓ Xong' : `Còn ${item.expectedQty - total}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!locked && (
          <button onClick={confirmQC} disabled={submitting}
            style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: totalFail > 0 ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Đang gửi...' : totalFail > 0 ? `🔍 Xác nhận QC — ${totalFail} FAIL` : '✅ Tất cả PASS — Gửi duyệt'}
          </button>
        )}
        {locked && <LockedOverlay msg={lockedMsg} />}
        <button onClick={() => { stopQr(); lockUI('Phiên scan đã kết thúc'); }}
          style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: '#ef4444', color: '#fff', marginBottom: 8 }}>
          🛑 Kết thúc Scan
        </button>
      </div>
      <ToastOverlay toasts={toasts} />
      <style>{`@keyframes scan{0%,100%{top:20%}50%{top:80%}}*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none}button{transition:all .15s}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OUTBOUND — Picking + QC xuất kho
// [V20] Thêm photo upload khi FAIL
// ─────────────────────────────────────────────────────────────────────────────
function OutboundScanner({ token, mode, taskId }: { token: string; mode: 'outbound_picking' | 'outbound_qc'; taskId: number | null }) {
  const { toasts, show: toast } = useToast();
  const [status, setStatus]         = useState('Đang khởi động camera...');
  const [manualCode, setManualCode] = useState('');
  const [locked, setLocked]         = useState(false);
  const [lockedMsg, setLockedMsg]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qcCondition, setQcCondition] = useState<QcCondition>('PASS');
  const [pickItems, setPickItems]         = useState<PickItem[]>([]);
  const [pickItemsLoading, setPickItemsLoading] = useState(false);
  const [scannedQty, setScannedQty]       = useState<Record<string, number>>({});
  const [scanLines, setScanLines]   = useState<Record<string, ScanLine>>({});
  const [qcScannedQty, setQcScannedQty] = useState<Record<string, number>>({});
  const [qcItemCondition, setQcItemCondition] = useState<Record<string, QcCondition>>({});

  // [V20] Photo upload state
  // [FIX QC] Dùng queue thay vì single state — tránh mất scan khi FAIL liên tiếp nhanh
  const [failQueue, setFailQueue] = useState<Array<{ barcode: string; target: { item: PickItem; key: string; req: number; curVal: number } }>>([]);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const failQueueRef = useRef<Array<{ barcode: string; target: { item: PickItem; key: string; req: number; curVal: number } }>>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const inflightRef  = useRef(false);
  const pickItemsRef = useRef<PickItem[]>([]);
  const scannedRef   = useRef<Record<string, number>>({});
  const qcScannedRef = useRef<Record<string, number>>({});
  const qcItemCondRef = useRef<Record<string, QcCondition>>({});
  const conditionRef = useRef<QcCondition>('PASS');
  const sessionId    = getSessionId(token);
  useEffect(() => { pickItemsRef.current = pickItems; }, [pickItems]);
  useEffect(() => { scannedRef.current = scannedQty; }, [scannedQty]);
  useEffect(() => { qcScannedRef.current = qcScannedQty; }, [qcScannedQty]);
  useEffect(() => { qcItemCondRef.current = qcItemCondition; }, [qcItemCondition]);
  useEffect(() => { conditionRef.current = qcCondition; }, [qcCondition]);

  useEffect(() => {
    if (!taskId) return;
    if (mode !== 'outbound_picking' && mode !== 'outbound_qc') return;
    setPickItemsLoading(true);
    fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d?.success) {
          const raw: any[] = d.data?.items ?? [];
          const items: PickItem[] = raw.map((it: any) => ({
            taskItemId:   it.pickingTaskItemId ?? it.taskItemId ?? undefined,
            skuCode:      it.skuCode ?? '',
            skuName:      it.skuName ?? '',
            locationCode: it.locationCode ?? '',
            lotNumber:    it.lotNumber ?? undefined,
            barcode:      it.barcode ?? undefined,
            requiredQty:  Number(it.requiredQty ?? it.qtyToPick ?? 1),
          }));
          pickItemsRef.current = items;
          setPickItems(items);
        }
      }).catch(err => console.warn('[ScannerPage] pick-list fetch error:', err))
      .finally(() => setPickItemsLoading(false));
  }, [mode, taskId, token]);

  const lockUI = useCallback((msg: string) => { setLocked(true); setLockedMsg(msg); }, []);

  // [V20] Upload ảnh hàng hỏng lên server
  const uploadDamagePhoto = async (file: File): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append('photo', file);
      const r = await fetch(`${API_BASE}/v1/attachments/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const d = await r.json();
      return d?.data?.url ?? null;
    } catch {
      return null;
    }
  };

  // [V20] Tách hàm gửi QC API để tái dùng sau khi upload ảnh
  const sendQcApiCall = useCallback(async (
    barcode: string,
    target: { item: PickItem; key: string; req: number; curVal: number },
    attachmentUrl: string | null,
  ) => {
    inflightRef.current = true;
    setStatus(`Gửi QC: ${target.item.skuCode} ×${target.req}`);
    try {
      const body: any = {
        barcode,
        qty: target.req,
        condition: conditionRef.current,
        mode: 'outbound_qc',
        taskId,
        // [FIX QC] Gửi pickingTaskItemId để BE dùng trực tiếp — tránh nhầm row cùng SKU
        ...(target.item.taskItemId ? { pickingTaskItemId: target.item.taskItemId } : {}),
        ...(attachmentUrl ? { attachmentUrl } : {}),
      };
      const r = await fetch(`${API_BASE}/v1/scan-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d?.success) {
        // [FIX QC] Cập nhật scanLines theo skuCode + condition riêng biệt
        setScanLines(prev => {
          const lineKey = `${d.data.skuCode}_${conditionRef.current}`;
          const ex = prev[lineKey];
          return { ...prev, [lineKey]: { ...d.data, qty: (ex?.qty ?? 0) + target.req, condition: conditionRef.current } };
        });
        toast(`✓ ${d.data?.skuCode} ×${target.req} [${conditionRef.current}] — Ghi nhận!`);
        if (d.data?.allScanned) {
          // [FIX QC] Phân biệt FAIL/PASS khi lock — không hiện "hoàn tất" khi có FAIL
          const fc = d.data?.failCount ?? 0;
          const hc = d.data?.holdCount ?? 0;
          if (fc > 0 || hc > 0) {
            lockUI(`⚠️ QC xong — có ${fc} FAIL${hc > 0 ? `, ${hc} HOLD` : ''}. Bấm Kết thúc Scan để báo Manager.`);
            toast(`⚠️ QC xong — ${fc} FAIL!`);
          } else {
            lockUI('✅ QC hoàn tất — tất cả PASS. Keeper có thể xuất kho!');
            toast('✅ QC hoàn tất — tất cả PASS!');
          }
        }
      } else {
        qcScannedRef.current = { ...qcScannedRef.current, [target.key]: target.curVal };
        setQcScannedQty({ ...qcScannedRef.current });
        toast(d?.message ?? 'Lỗi ghi nhận QC', true);
      }
    } catch {
      qcScannedRef.current = { ...qcScannedRef.current, [target.key]: target.curVal };
      setQcScannedQty({ ...qcScannedRef.current });
      toast('Mất kết nối', true);
    } finally {
      inflightRef.current = false;
      setStatus('Camera sẵn sàng');
      setTimeout(() => { inflightRef.current = false; }, 600);
    }
  }, [taskId, token, toast, lockUI]);

  // [FIX QC] processNextFail — tách ra ngoài render, sau sendQcApiCall để tránh TDZ
  const processNextFail = useCallback(async (url: string | null) => {
    const queue = failQueueRef.current;
    if (queue.length === 0) return;
    const cur = queue[0];
    await sendQcApiCall(cur.barcode, cur.target, url);
    const remaining = queue.slice(1);
    failQueueRef.current = remaining;
    setFailQueue([...remaining]);
    setShowPhotoPrompt(remaining.length > 0);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }, [sendQcApiCall]);

  const sendBarcode = useCallback(async (barcode: string) => {
    if (locked || inflightRef.current) return;

    // ── PICKING mode ──────────────────────────────────────────────────────────
    if (mode === 'outbound_picking') {
      const cur = scannedRef.current;
      const matched = pickItemsRef.current.map((it, idx) => ({ it, idx })).filter(({ it }) => it.skuCode.toUpperCase() === barcode || (it.barcode ?? '').toUpperCase() === barcode);
      if (!matched.length) { toast(`${barcode} không có trong Pick List!`, true); return; }
      let target: { item: PickItem; key: string; req: number; curVal: number } | null = null;
      for (const { it, idx } of matched) {
        const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${idx}`; const req = it.requiredQty; const curVal = cur[key] ?? 0;
        if (curVal < req) { target = { item: it, key, req, curVal }; break; }
      }
      if (!target) { toast(`Đã đủ ${matched[0].it.skuCode}`); return; }
      const newVal = target.curVal + 1;
      scannedRef.current = { ...cur, [target.key]: newVal }; setScannedQty({ ...scannedRef.current });
      const rem = target.req - newVal;
      toast(rem > 0 ? `${target.item.skuCode} ${newVal}/${target.req} (còn ${rem})` : `✅ Đủ! ${target.item.skuCode}`);
      if (navigator.vibrate) navigator.vibrate(rem <= 0 ? [80, 30, 80] : 80);
      return;
    }

    // ── QC mode ───────────────────────────────────────────────────────────────
    if (mode === 'outbound_qc') {
      if (barcode.includes('/v1/scan') && barcode.includes('token=')) { setStatus('⚠️ Đây là link mở trang scan, không phải barcode sản phẩm'); return; }
      if (barcode.toLowerCase().startsWith('http://') || barcode.toLowerCase().startsWith('https://')) { setStatus('⚠️ Phát hiện URL — vui lòng quét barcode sản phẩm'); return; }

      const items = pickItemsRef.current;
      if (!items.length) {
        inflightRef.current = true; setStatus(`Gửi QC: ${barcode}`);
        try {
          const body: any = { barcode, qty: 1, condition: conditionRef.current, mode: 'outbound_qc', taskId };
          const r = await fetch(`${API_BASE}/v1/scan-events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
          const d = await r.json();
          if (d?.success) {
            toast(`✓ ${d.data?.skuCode} [${conditionRef.current}]`);
            if (navigator.vibrate) navigator.vibrate(60);
            if (d.data?.allScanned) { lockUI('✅ QC hoàn tất'); toast('✅ QC hoàn tất!'); }
          } else toast(d?.message ?? 'Lỗi', true);
        } catch { toast('Mất kết nối', true); }
        finally { inflightRef.current = false; setStatus('Camera sẵn sàng'); setTimeout(() => { inflightRef.current = false; }, 600); }
        return;
      }

      const matched = items.map((it, idx) => ({ it, idx })).filter(({ it }) =>
        it.skuCode.toUpperCase() === barcode || (it.barcode ?? '').toUpperCase() === barcode
      );
      if (!matched.length) { toast(`${barcode} không có trong Pick List QC!`, true); if (navigator.vibrate) navigator.vibrate([80, 30, 80]); return; }

      const curQcQty = qcScannedRef.current;
      let target: { item: PickItem; key: string; req: number; curVal: number } | null = null;
      for (const { it, idx } of matched) {
        const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${idx}`;
        const req = it.requiredQty;
        const curVal = curQcQty[key] ?? 0;
        if (curVal < req) { target = { item: it, key, req, curVal }; break; }
      }

      if (!target) { toast(`✓ Đã quét đủ ${matched[0].it.skuCode}`, false); return; }

      const newVal = target.curVal + 1;
      const rem = target.req - newVal;

      const newQcQty = { ...curQcQty, [target.key]: newVal };
      qcScannedRef.current = newQcQty;
      setQcScannedQty({ ...newQcQty });
      // [FIX QC] Luôn cập nhật condition — bỏ guard !qcItemCondRef.current[target.key]
      // Guard cũ chỉ set lần đầu → nếu scan lại với condition khác (PASS/FAIL) không cập nhật
      const newCond = { ...qcItemCondRef.current, [target.key]: conditionRef.current };
      qcItemCondRef.current = newCond;
      setQcItemCondition({ ...newCond });

      if (rem > 0) {
        toast(`${target.item.skuCode} [${conditionRef.current}] ${newVal}/${target.req} — còn ${rem} cái`);
        if (navigator.vibrate) navigator.vibrate(80);
        setStatus(`${target.item.skuCode}: ${newVal}/${target.req}`);
        return;
      }

      // [V20] Đủ qty + FAIL → enqueue photo prompt
      if (conditionRef.current === 'FAIL') {
        const newEntry = { barcode, target };
        const newQueue = [...failQueueRef.current, newEntry];
        failQueueRef.current = newQueue;
        setFailQueue([...newQueue]);
        // Chỉ show prompt nếu chưa đang hiện (queue trước đó rỗng)
        if (newQueue.length === 1) setShowPhotoPrompt(true);
        toast(`📷 ${target.item.skuCode} FAIL — chụp ảnh hàng hỏng (bỏ qua được)`);
        if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
        return;
      }

      // PASS/HOLD → gửi thẳng API
      await sendQcApiCall(barcode, target, null);
      return;
    }

    if (barcode.includes('/v1/scan') && barcode.includes('token=')) { setStatus('⚠️ Đây là link mở trang scan, không phải barcode sản phẩm'); return; }
    if (barcode.toLowerCase().startsWith('http://') || barcode.toLowerCase().startsWith('https://')) { setStatus('⚠️ Phát hiện URL — vui lòng quét barcode sản phẩm'); return; }
  }, [locked, mode, token, taskId, toast, lockUI, sendQcApiCall]);

  const { stopQr } = useCamera(sendBarcode, setStatus);

  useEffect(() => {
    return () => { if (sessionId) fetch(`${API_BASE}/v1/receiving-sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); };
  }, [sessionId, token]);

  const scanLineList  = Object.values(scanLines);
  const pickAllDone   = pickItems.length > 0 && pickItems.every((it, i) => { const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`; return (scannedQty[key] ?? 0) >= it.requiredQty; });
  const totalScanned  = Object.values(scannedQty).reduce((s, v) => s + v, 0);
  const totalRequired = pickItems.reduce((s, it) => s + it.requiredQty, 0);
  const qcTotalScanned  = Object.values(qcScannedQty).reduce((s: number, v: unknown) => s + (v as number), 0);
  const qcTotalRequired = pickItems.reduce((s, it) => s + it.requiredQty, 0);
  // [FIX] Đếm FAIL/HOLD từ qcItemCondition để hiện nút đúng màu
  const totalFail = Object.values(qcItemCondition).filter((c: unknown) => c === 'FAIL').length;
  const totalHold = Object.values(qcItemCondition).filter((c: unknown) => c === 'HOLD').length;
  const condClr       = qcCondition === 'PASS' ? '#10b981' : qcCondition === 'FAIL' ? '#ef4444' : '#f59e0b';
  const headerBg      = mode === 'outbound_qc' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#1e40af,#1d4ed8)';
  const modeLabel     = mode === 'outbound_picking' ? '📦 Picking' : '🔍 QC Xuất kho';

  const confirmPicked = async () => {
    if (!taskId || !window.confirm('Xác nhận đã lấy đủ hàng? Gửi sang QC.')) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}/confirm-picked`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const d = await r.json();
      if (d?.success) { toast('✅ Đã gửi QC!'); lockUI('Keeper xác nhận xong — chờ QC'); }
      else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  const finalizeQc = async (allPass: boolean) => {
    if (!taskId || !window.confirm(allPass ? 'Tất cả hàng PASS — cho xuất kho?' : 'Xác nhận có hàng FAIL/HOLD?')) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/outbound/pick-list/${taskId}/finalize-qc`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const d = await r.json();
      if (d?.success) {
        const failCount = d.data?.failCount ?? 0;
        if (failCount > 0) {
          toast(`⚠️ ${failCount} FAIL — SO chuyển ON_HOLD, chờ Manager xử lý`);
          lockUI(`⚠️ ${failCount} hàng FAIL — Manager sẽ xử lý Incident`);
        } else {
          toast('✅ QC PASS!');
          lockUI('QC hoàn tất — Keeper có thể xuất kho!');
        }
      } else toast(d?.message ?? 'Lỗi', true);
    } catch { toast('Lỗi kết nối', true); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <header style={{ background: headerBg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, flex: 1, margin: 0 }}>{modeLabel}</h1>
        <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
          {mode === 'outbound_picking' ? `${totalScanned}/${totalRequired}` : `${qcTotalScanned}/${qcTotalRequired}`}
        </span>
      </header>
      <div style={{ padding: 12, maxWidth: 520, margin: '0 auto' }}>
        {mode === 'outbound_qc' && !locked && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['PASS', 'FAIL', 'HOLD'] as QcCondition[]).map(c => {
              const clr = c === 'PASS' ? '#10b981' : c === 'FAIL' ? '#ef4444' : '#f59e0b'; const active = qcCondition === c;
              return <button key={c} onClick={() => setQcCondition(c)} style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: `2px solid ${active ? clr : '#334155'}`, background: active ? `rgba(${c==='PASS'?'16,185,129':c==='FAIL'?'239,68,68':'245,158,11'},.1)` : 'transparent', color: active ? clr : '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{c}</button>;
            })}
          </div>
        )}
        <CameraSection status={status} manualCode={manualCode} onManualChange={setManualCode}
          onManualScan={() => { manualCode.trim() && sendBarcode(manualCode.trim().toUpperCase()); setManualCode(''); }}
          accentColor={mode === 'outbound_qc' ? condClr : '#3b82f6'} />

        {/* [FIX QC] Photo prompt dùng queue — xử lý từng FAIL scan một */}
        {showPhotoPrompt && mode === 'outbound_qc' && failQueue.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, border: '1px solid #ef4444' }}>
            <p style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700, margin: '0 0 4px' }}>
              📷 Chụp ảnh hàng hỏng (tùy chọn — làm bằng chứng cho Incident)
            </p>
            {failQueue.length > 1 && (
              <p style={{ fontSize: 11, color: '#f87171', margin: '0 0 10px' }}>
                {failQueue[0].target.item.skuCode} — còn {failQueue.length - 1} FAIL khác chờ xử lý
              </p>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                let url: string | null = null;
                if (file) {
                  toast('Đang upload ảnh...');
                  url = await uploadDamagePhoto(file);
                  if (url) toast('✅ Đã upload ảnh hàng hỏng');
                  else toast('Upload ảnh thất bại — gửi không kèm ảnh', true);
                }
                await processNextFail(url);
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                📷 Chụp ảnh
              </button>
              <button
                onClick={async () => { await processNextFail(null); }}
                style={{ flex: 1, padding: '12px', border: '1px solid #475569', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        {mode === 'outbound_picking' && pickItems.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, margin: '0 0 10px' }}>📋 Picking — Xác nhận lấy hàng</p>
            {pickItems.map((it, i) => {
              const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`; const cur = scannedQty[key] ?? 0; const done = cur >= it.requiredQty;
              return (
                <div key={key} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, background: done ? 'rgba(16,185,129,.08)' : '#0f172a', borderLeft: `3px solid ${done ? '#10b981' : '#334155'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{it.skuCode}</p><p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{it.skuName} · {it.locationCode}</p></div>
                    <div style={{ textAlign: 'right' }}><p style={{ fontSize: 15, fontWeight: 800, color: '#60a5fa', margin: 0 }}>×{it.requiredQty}</p>{done ? <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700, margin: 0 }}>✓</p> : <p style={{ fontSize: 10, color: '#f59e0b', margin: 0 }}>{cur}/{it.requiredQty}</p>}</div>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>{totalScanned}/{totalRequired} đã quét.{pickAllDone ? ' ✓ Sẵn sàng!' : ''}</p>
          </div>
        )}

        {mode === 'outbound_qc' && pickItemsLoading && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#a78bfa', margin: 0 }}>⏳ Đang tải danh sách kiểm tra...</p>
          </div>
        )}

        {mode === 'outbound_qc' && pickItems.length > 0 && !pickItemsLoading && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, margin: 0 }}>🔍 QC — Quét từng sản phẩm</p>
              <span style={{ fontSize: 11, color: qcTotalScanned >= qcTotalRequired ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                {qcTotalScanned}/{qcTotalRequired}
              </span>
            </div>
            {pickItems.map((it, i) => {
              const key = it.taskItemId ? String(it.taskItemId) : `${it.skuCode}_${i}`;
              const cur = qcScannedQty[key] ?? 0;
              const req = it.requiredQty;
              const done = cur >= req;
              const cond = qcItemCondition[key];
              const condClrItem = cond === 'PASS' ? '#10b981' : cond === 'FAIL' ? '#ef4444' : cond === 'HOLD' ? '#f59e0b' : '#334155';
              return (
                <div key={key} style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 6, background: done ? `rgba(${cond==='FAIL'?'239,68,68':cond==='HOLD'?'245,158,11':'16,185,129'},.08)` : '#0f172a', borderLeft: `3px solid ${done ? condClrItem : cur > 0 ? '#f59e0b' : '#334155'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{it.skuCode}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{it.skuName} · {it.locationCode}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {done ? (
                        <>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: `rgba(${cond==='FAIL'?'239,68,68':cond==='HOLD'?'245,158,11':'16,185,129'},.15)`, color: condClrItem }}>{cond ?? 'PASS'}</span>
                          <p style={{ fontSize: 10, color: '#10b981', fontWeight: 700, margin: '4px 0 0' }}>✓ {req}/{req}</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 15, fontWeight: 800, color: '#a78bfa', margin: 0 }}>×{req}</p>
                          <p style={{ fontSize: 10, color: cur > 0 ? '#f59e0b' : '#475569', margin: '2px 0 0' }}>{cur > 0 ? `${cur}/${req} quét` : 'Chưa quét'}</p>
                        </>
                      )}
                    </div>
                  </div>
                  {req > 1 && (
                    <div style={{ marginTop: 6, height: 3, background: '#1e3a5f', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (cur / req) * 100)}%`, background: done ? condClrItem : '#f59e0b', borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                  )}
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>
              {qcTotalScanned}/{qcTotalRequired} đã quét.
              {qcTotalScanned >= qcTotalRequired ? ' ✓ Sẵn sàng finalize!' : ` Còn ${qcTotalRequired - qcTotalScanned} cái.`}
            </p>
          </div>
        )}

        {mode === 'outbound_qc' && scanLineList.length > 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px' }}>✅ Đã ghi nhận</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>{scanLineList.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e3a5f' }}>
                  <td style={{ padding: '7px 4px', color: '#94a3b8' }}>{l.skuCode}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: l.condition === 'FAIL' ? 'rgba(239,68,68,.15)' : l.condition === 'HOLD' ? 'rgba(245,158,11,.15)' : 'rgba(16,185,129,.15)', color: l.condition === 'FAIL' ? '#ef4444' : l.condition === 'HOLD' ? '#f59e0b' : '#10b981' }}>{l.condition}</span></td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>×{l.qty}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {!locked && (
          <div style={{ marginBottom: 8 }}>
            {mode === 'outbound_picking' && <button onClick={confirmPicked} disabled={!pickAllDone || submitting} style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', marginBottom: 8, opacity: (!pickAllDone || submitting) ? 0.5 : 1 }}>{submitting ? 'Đang gửi...' : 'Gửi sang QC — Đã lấy đủ hàng'}</button>}
            {mode === 'outbound_qc' && (() => {
              const allQcDone = qcTotalScanned >= qcTotalRequired && qcTotalRequired > 0;
              const hasFailItems = Object.values(qcItemCondition).some(c => c === 'FAIL' || c === 'HOLD');
              return (
                <>
                  {!allQcDone && (
                    <div style={{ padding: '10px 14px', background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 8, marginBottom: 8 }}>
                      <p style={{ color: '#a78bfa', fontSize: 12, margin: 0, fontWeight: 600 }}>
                        ⏳ Còn {qcTotalRequired - qcTotalScanned} mặt hàng chưa quét
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => finalizeQc(!hasFailItems)}
                    disabled={submitting || !allQcDone}
                    style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: allQcDone ? 'pointer' : 'not-allowed', background: !allQcDone ? '#1e293b' : hasFailItems ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: allQcDone ? '#fff' : '#475569', marginBottom: 8, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? 'Đang gửi...' : !allQcDone ? `Chờ quét đủ (${qcTotalScanned}/${qcTotalRequired})` : hasFailItems ? `🔍 Xác nhận QC — ${totalFail} FAIL` : '✅ Tất cả PASS — Gửi duyệt'}
                  </button>
                </>
              );
            })()}
          </div>
        )}
        {locked && <LockedOverlay msg={lockedMsg} />}
        <button onClick={() => { stopQr(); lockUI('Phiên scan đã kết thúc'); }} style={{ width: '100%', padding: '14px 18px', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: '#ef4444', color: '#fff', marginBottom: 8 }}>🛑 Kết thúc Scan</button>
      </div>
      <ToastOverlay toasts={toasts} />
      <style>{`@keyframes scan{0%,100%{top:20%}50%{top:80%}}*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none}button{transition:opacity .15s}`}</style>
    </div>
  );
}

// ─── ROOT ROUTER ──────────────────────────────────────────────────────────────
export default function ScannerPage() {
  const params         = useSearchParams();
  const token          = params.get('token') ?? '';
  const taskIdStr      = params.get('taskId');
  const modeParam      = params.get('mode') as ScanMode | null;
  const receivingIdStr = params.get('receivingId');
  const mode           = modeParam ?? 'inbound';
  const taskId         = taskIdStr ? Number(taskIdStr) : null;
  const receivingId    = receivingIdStr ? Number(receivingIdStr) : null;
  const userRole       = getUserRole(token);
  const scriptSrc      = `${API_BASE}/js/html5-qrcode.min.js`;

  if (mode === 'inbound' && receivingId) {
    if (userRole === 'QC') return <><QCInboundScanner token={token} receivingId={receivingId} /><Script src={scriptSrc} strategy="afterInteractive" /></>;
    return <><KeeperInboundScanner token={token} receivingId={receivingId} /><Script src={scriptSrc} strategy="afterInteractive" /></>;
  }
  return <><OutboundScanner token={token} mode={mode as 'outbound_picking'|'outbound_qc'} taskId={taskId} /><Script src={scriptSrc} strategy="afterInteractive" /></>;
}