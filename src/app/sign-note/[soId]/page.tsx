'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

type State = 'idle' | 'preview' | 'uploading' | 'done' | 'error';

export default function SignNotePage() {
  const { soId } = useParams<{ soId: string }>();
  const [state, setState] = useState<State>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
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

      const res = await fetch(`${API}/outbound/sales-orders/${soId}/signed-note`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Upload thất bại');

      setResultUrl(json.data?.url ?? '');
      setState('done');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Có lỗi xảy ra');
      setState('error');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultUrl(null);
    setErrorMsg('');
    setState('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px', fontFamily: 'system-ui,sans-serif',
    }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
        <div style={{
          width:40, height:40, borderRadius:12,
          background:'linear-gradient(135deg,#4f46e5,#6366f1)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ fontSize:22 }}>🏭</span>
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:16, letterSpacing:0.3 }}>WMS Portal</div>
          <div style={{ color:'#818cf8', fontSize:10, fontWeight:600, letterSpacing:1 }}>SIGNED DOCUMENT</div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:20,
        padding:28, width:'100%', maxWidth:420,
        boxShadow:'0 25px 50px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:'#c7d2fe', fontSize:11, fontWeight:600, letterSpacing:1, marginBottom:4 }}>
            ĐƠN HÀNG #{soId}
          </div>
          <h1 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>
            Chụp phiếu xuất kho đã ký
          </h1>
          <p style={{ color:'#94a3b8', fontSize:12, marginTop:6, lineHeight:1.5 }}>
            Chụp ảnh phiếu sau khi đã có đầy đủ chữ ký. Ảnh sẽ được lưu vào hệ thống.
          </p>
        </div>

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              style={{ display:'none' }}
              id="camera-input"
            />
            <label htmlFor="camera-input" style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:12, padding:'36px 20px', borderRadius:16, cursor:'pointer',
              border:'2px dashed rgba(99,102,241,0.5)', background:'rgba(99,102,241,0.08)',
              transition:'all 0.2s',
            }}>
              <div style={{ fontSize:48 }}>📷</div>
              <div style={{ color:'#e2e8f0', fontWeight:700, fontSize:15 }}>Mở camera chụp ảnh</div>
              <div style={{ color:'#64748b', fontSize:12 }}>hoặc chọn ảnh từ thư viện</div>
            </label>

            {/* Option chọn từ thư viện */}
            <input
              type="file"
              accept="image/*"
              onChange={handleCapture}
              style={{ display:'none' }}
              id="gallery-input"
            />
            <label htmlFor="gallery-input" style={{
              display:'block', textAlign:'center', marginTop:12,
              color:'#818cf8', fontSize:13, fontWeight:600, cursor:'pointer',
              padding:'10px', borderRadius:10, background:'rgba(99,102,241,0.1)',
            }}>
              🖼 Chọn từ thư viện ảnh
            </label>
          </>
        )}

        {/* ── PREVIEW ── */}
        {state === 'preview' && preview && (
          <>
            <div style={{ borderRadius:14, overflow:'hidden', marginBottom:16, border:'2px solid rgba(99,102,241,0.4)' }}>
              <img src={preview} alt="preview" style={{ width:'100%', maxHeight:320, objectFit:'contain', background:'#000' }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={reset} style={{
                flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.15)',
                background:'transparent', color:'#94a3b8', fontWeight:600, fontSize:14, cursor:'pointer',
              }}>
                ↩ Chụp lại
              </button>
              <button onClick={handleUpload} style={{
                flex:2, padding:'13px', borderRadius:12, border:'none',
                background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff',
                fontWeight:700, fontSize:14, cursor:'pointer',
                boxShadow:'0 4px 15px rgba(99,102,241,0.4)',
              }}>
                ✅ Xác nhận & Gửi lên
              </button>
            </div>
          </>
        )}

        {/* ── UPLOADING ── */}
        {state === 'uploading' && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:48, marginBottom:16, animation:'spin 1s linear infinite' }}>⏳</div>
            <div style={{ color:'#c7d2fe', fontWeight:700, fontSize:16 }}>Đang tải lên hệ thống...</div>
            <div style={{ color:'#64748b', fontSize:12, marginTop:8 }}>Vui lòng đợi</div>
          </div>
        )}

        {/* ── DONE ── */}
        {state === 'done' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
            <div style={{ color:'#4ade80', fontWeight:800, fontSize:18, marginBottom:8 }}>
              Đã lưu thành công!
            </div>
            <div style={{ color:'#94a3b8', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
              Ảnh phiếu ký đơn #{soId} đã được lưu vào hệ thống. Quản lý có thể xem lại trên hệ thống WMS.
            </div>
            {resultUrl && (
              <a href={resultUrl} target="_blank" rel="noreferrer" style={{
                display:'block', color:'#818cf8', fontSize:12,
                textDecoration:'underline', marginBottom:20, wordBreak:'break-all',
              }}>
                Xem ảnh đã lưu ↗
              </a>
            )}
            <button onClick={reset} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.15)',
              background:'rgba(255,255,255,0.06)', color:'#c7d2fe', fontWeight:600,
              fontSize:14, cursor:'pointer',
            }}>
              📷 Chụp thêm ảnh khác
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>❌</div>
            <div style={{ color:'#f87171', fontWeight:700, fontSize:16, marginBottom:8 }}>
              Upload thất bại
            </div>
            <div style={{ color:'#94a3b8', fontSize:13, marginBottom:20, background:'rgba(239,68,68,0.1)', padding:'12px', borderRadius:10 }}>
              {errorMsg}
            </div>
            <button onClick={reset} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff',
              fontWeight:700, fontSize:14, cursor:'pointer',
            }}>
              Thử lại
            </button>
          </div>
        )}

      </div>

      <div style={{ color:'#334155', fontSize:11, marginTop:20 }}>
        WMS Portal © 2026 — Chỉ dùng nội bộ
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
