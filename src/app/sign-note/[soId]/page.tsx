'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

// Hardcode fallback để đảm bảo luôn có URL dù build arg không được truyền
const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.cleanhousewms.id.vn/v1';

type State = 'idle' | 'preview' | 'uploading' | 'done' | 'error';

export default function SignNotePage() {
  const { soId } = useParams<{ soId: string }>();
  const [state, setState]         = useState<State>('idle');
  const [preview, setPreview]     = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [fileInfo, setFileInfo]   = useState('');
  const inputRef  = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFileInfo(`${f.name} — ${(f.size / 1024 / 1024).toFixed(1)}MB`);
    setState('preview');
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState('uploading');
    try {
      const form = new FormData();
      form.append('photo', file);

      const url = `${API}/outbound/sales-orders/${soId}/signed-note`;
      console.log('Uploading to:', url, 'File size:', file.size);

      const res = await fetch(url, {
        method: 'POST',
        body: form,
        // Không set Content-Type — browser tự set multipart/form-data với boundary
      });

      let json: any = {};
      try { json = await res.json(); } catch { /* ignore */ }

      console.log('Response:', res.status, json);

      if (!res.ok) {
        throw new Error(json.message || `Lỗi ${res.status}: ${res.statusText}`);
      }

      setResultUrl(json.data?.url ?? '');
      setState('done');

      // Broadcast ngay sang desktop — desktop nhận và fetch ảnh lập tức
      try {
        const bc = new BroadcastChannel(`signed_note_${soId}`);
        bc.postMessage({ type: 'signed_note_uploaded', soId, url: json.data?.url });
        bc.close();
      } catch { /* ignore nếu không support */ }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message ?? 'Không thể kết nối server. Kiểm tra mạng và thử lại.');
      setState('error');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultUrl(null);
    setErrorMsg('');
    setFileInfo('');
    setState('idle');
    if (inputRef.current)  inputRef.current.value  = '';
    if (input2Ref.current) input2Ref.current.value = '';
  };

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  };

  const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', ...extra,
  });

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🏭</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>WMS Portal</div>
          <div style={{ color: '#818cf8', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>SIGNED DOCUMENT</div>
        </div>
      </div>

      <div style={card}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#c7d2fe', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
            ĐƠN HÀNG #{soId}
          </div>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
            Chụp phiếu xuất kho đã ký
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
            Chụp ảnh phiếu sau khi đã có đầy đủ chữ ký. Ảnh sẽ được lưu vào hệ thống.
          </p>
        </div>

        {/* IDLE */}
        {state === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              onChange={handleCapture} style={{ display: 'none' }} id="cam" />
            <label htmlFor="cam" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: '32px 20px', borderRadius: 16, cursor: 'pointer',
              border: '2px dashed rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.08)',
            }}>
              <div style={{ fontSize: 44 }}>📷</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>Mở camera chụp ảnh</div>
            </label>

            <input ref={input2Ref} type="file" accept="image/*"
              onChange={handleCapture} style={{ display: 'none' }} id="gallery" />
            <label htmlFor="gallery" style={{
              display: 'block', textAlign: 'center', color: '#818cf8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              padding: '10px', borderRadius: 10, background: 'rgba(99,102,241,0.1)',
            }}>
              🖼 Chọn từ thư viện ảnh
            </label>
          </div>
        )}

        {/* PREVIEW */}
        {state === 'preview' && preview && (
          <div>
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: '2px solid rgba(99,102,241,0.4)' }}>
              <img src={preview} alt="preview"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: '#000', display: 'block' }} />
            </div>
            {fileInfo && (
              <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>
                {fileInfo}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} style={btn({
                flex: 1, background: 'transparent', color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.15)',
              })}>↩ Chụp lại</button>
              <button onClick={handleUpload} style={btn({
                flex: 2, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff',
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
              })}>✅ Gửi lên hệ thống</button>
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {state === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⏳</div>
            <div style={{ color: '#c7d2fe', fontWeight: 700, fontSize: 16 }}>Đang tải lên...</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Vui lòng giữ nguyên kết nối</div>
          </div>
        )}

        {/* DONE */}
        {state === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Lưu thành công!</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Ảnh phiếu ký đơn #{soId} đã được lưu. Quản lý có thể xem lại trên hệ thống WMS.
            </div>
            {resultUrl && (
              <a href={resultUrl} target="_blank" rel="noreferrer" style={{
                display: 'block', marginBottom: 16,
              }}>
                <img src={resultUrl} alt="uploaded" style={{
                  width: '100%', maxHeight: 200, objectFit: 'contain',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                }} />
              </a>
            )}
            <button onClick={reset} style={btn({
              background: 'rgba(255,255,255,0.06)', color: '#c7d2fe',
              border: '1px solid rgba(255,255,255,0.15)',
            })}>📷 Chụp thêm ảnh</button>
          </div>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Upload thất bại</div>
            <div style={{
              color: '#fca5a5', fontSize: 12, marginBottom: 20,
              background: 'rgba(239,68,68,0.1)', padding: '12px 14px',
              borderRadius: 10, textAlign: 'left', lineHeight: 1.6,
              wordBreak: 'break-word',
            }}>
              {errorMsg}
            </div>
            <button onClick={reset} style={btn({
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff',
            })}>Thử lại</button>
          </div>
        )}
      </div>

      <div style={{ color: '#1e293b', fontSize: 11, marginTop: 20 }}>
        WMS Portal © 2026 — Chỉ dùng nội bộ
      </div>
    </div>
  );
}
