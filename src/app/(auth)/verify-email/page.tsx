'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resendOtp, verifyOtp } from '@/services/authService';

/* ─── Particle canvas ─── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const pts = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      ox: 0, oy: 0,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .3,
      parallax: Math.random() * .012 + .003,
    }));
    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const tx = (mx - cx) * p.parallax, ty = (my - cy) * p.parallax;
        p.ox += (tx - p.ox) * .04; p.oy += (ty - p.oy) * .04;
        ctx.beginPath(); ctx.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,.3)'; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        const ax = pts[i].x + pts[i].ox, ay = pts[i].y + pts[i].oy;
        for (let j = i + 1; j < pts.length; j++) {
          const bx = pts[j].x + pts[j].ox, by = pts[j].y + pts[j].oy;
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(99,102,241,${.08 * (1 - d / 100)})`; ctx.lineWidth = .6; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMouse); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}

/* ─── Uncontrolled OTP Input ─── */
function OtpInput({ onComplete }: { onComplete: (val: string) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  const focusAt = (i: number) => { if (i >= 0 && i <= 5) inputRefs.current[i]?.focus(); };

  const syncUp = () => {
    const val = inputRefs.current.map(el => el?.value || '').join('');
    onComplete(val);
  };

  const handleInput = (i: number, e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const raw = el.value.replace(/\D/g, '');
    el.value = raw ? raw[raw.length - 1] : '';
    syncUp();
    if (el.value && i < 5) focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const el = inputRefs.current[i];
      if (el?.value) { el.value = ''; syncUp(); }
      else if (i > 0) {
        const prev = inputRefs.current[i - 1];
        if (prev) prev.value = '';
        syncUp(); focusAt(i - 1);
      }
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((d, i) => { if (inputRefs.current[i]) inputRefs.current[i]!.value = d; });
    syncUp(); focusAt(Math.min(digits.length, 5));
  };

  const setFocusStyle = (el: HTMLInputElement, focused: boolean) => {
    if (focused) {
      el.style.borderColor = '#6366f1';
      el.style.background = '#eef2ff';
      el.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.15)';
    } else {
      el.style.borderColor = el.value ? '#6366f1' : '#e0e7ff';
      el.style.background = el.value ? '#eef2ff' : '#f8faff';
      el.style.boxShadow = 'none';
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={2}
          defaultValue=""
          onInput={e => handleInput(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => { e.target.select(); setFocusStyle(e.currentTarget, true); }}
          onBlur={e => setFocusStyle(e.currentTarget, false)}
          onClick={e => (e.target as HTMLInputElement).select()}
          style={{
            width: 52, height: 60,
            textAlign: 'center', fontSize: 24, fontWeight: 700,
            border: '1.5px solid #e0e7ff', borderRadius: 14,
            background: '#f8faff', color: '#1e1b4b',
            outline: 'none', fontFamily: 'monospace',
            cursor: 'text', transition: 'border .15s, background .15s, box-shadow .15s',
          }}
        />
      ))}
    </div>
  );
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp,          setOtp]          = useState('');
  const [error,        setError]        = useState('');
  const [message,      setMessage]      = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [resendCount,  setResendCount]  = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pending_token');
    const storedEmail = localStorage.getItem('pending_email');
    if (!token || !storedEmail) { router.replace('/login'); return; }
    setPendingToken(token);
    setEmail(storedEmail);
  }, [router]);

  /* Countdown */
  useEffect(() => {
    if (resendCount <= 0) return;
    const t = setTimeout(() => setResendCount(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCount]);

  const handleVerify = async () => {
    if (otp.replace(/\D/g, '').length < 6) { setError('Vui lòng nhập đủ 6 chữ số.'); return; }
    if (!pendingToken) { setError('Phiên xác thực không hợp lệ. Vui lòng đăng nhập lại.'); return; }
    setIsLoading(true); setError(''); setMessage('');
    try {
      await verifyOtp({ pendingToken, otp: otp.replace(/\D/g, '') });
      localStorage.removeItem('pending_token');
      localStorage.removeItem('pending_email');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Mã không chính xác. Vui lòng thử lại.');
    } finally { setIsLoading(false); }
  };

  const handleResend = async () => {
    if (!pendingToken || resendCount > 0) return;
    setIsLoading(true); setError(''); setMessage('');
    try {
      await resendOtp(pendingToken);
      setMessage('Mã OTP mới đã được gửi tới email của bạn.');
      setResendCount(60);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi lại mã. Vui lòng thử lại.');
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes scaleIn{from{opacity:0;transform:scale(.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes pulse  {0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.35)}70%{box-shadow:0 0 0 10px rgba(99,102,241,0)}}
        @keyframes gradMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes ripple {from{transform:scale(.8);opacity:.5}to{transform:scale(2.2);opacity:0}}
      `}</style>

      {/* Background */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter',system-ui,sans-serif",
        background: 'linear-gradient(145deg,#eef2ff 0%,#f0f4ff 50%,#e8f0fe 100%)',
        position: 'relative', padding: '24px 16px', overflow: 'hidden',
      }}>
        <ParticleCanvas />

        {/* Glow blobs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.1),transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-8%', right: '-5%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.08),transparent 70%)' }} />
          {/* dot grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: .3, backgroundImage: 'radial-gradient(circle,rgba(99,102,241,.22) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        {/* Floating chips */}
        <div style={{ position: 'fixed', top: '10%', right: '6%', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,.85)', border: '1px solid rgba(99,102,241,.12)', boxShadow: '0 4px 16px rgba(99,102,241,.08)', display: 'flex', alignItems: 'center', gap: 7, animation: 'float 3.5s ease-in-out infinite', fontSize: 12, color: '#4b5563', fontFamily: 'inherit', zIndex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#4f46e5' }}>verified_user</span>
          Xác thực bảo mật
        </div>
        <div style={{ position: 'fixed', bottom: '12%', left: '5%', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,.85)', border: '1px solid rgba(99,102,241,.12)', boxShadow: '0 4px 16px rgba(99,102,241,.08)', display: 'flex', alignItems: 'center', gap: 7, animation: 'float 4s ease-in-out infinite .4s', fontSize: 12, color: '#4b5563', fontFamily: 'inherit', zIndex: 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#059669' }}>lock</span>
          Mã hoá đầu cuối
        </div>

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 2 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2.5s ease-in-out infinite' }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 19 }}>warehouse</span>
            </div>
            <span style={{ color: '#1e1b4b', fontSize: 16, fontWeight: 800 }}>WMS Portal</span>
          </div>

          <div style={{
            background: 'rgba(255,255,255,.92)',
            border: '1px solid rgba(99,102,241,.12)',
            borderRadius: 24, padding: '40px 36px 36px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(99,102,241,.1)',
            animation: 'scaleIn .4s cubic-bezier(.34,1.56,.64,1) both',
            position: 'relative',
          }}>
            {/* top accent */}
            <div style={{ position: 'absolute', top: 0, left: 36, right: 36, height: 2, borderRadius: '0 0 4px 4px', background: 'linear-gradient(90deg,#4f46e5,#818cf8,#3b82f6)' }} />

            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(99,102,241,.1)', animation: 'ripple 2s ease-out infinite' }} />
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '2px solid rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#4f46e5' }}>mark_email_read</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-.4px', marginBottom: 8 }}>
                Xác minh email
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Chúng tôi đã gửi mã 6 số đến
              </p>
              {email && (
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>{email}</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', marginBottom: 20, borderRadius: 12, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)', animation: 'fadeUp .25s ease' }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 17, flexShrink: 0 }}>error</span>
                <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Success */}
            {message && !error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', marginBottom: 20, borderRadius: 12, background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)', animation: 'fadeUp .25s ease' }}>
                <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: 17, flexShrink: 0 }}>check_circle</span>
                <span style={{ color: '#059669', fontSize: 13, fontWeight: 500 }}>{message}</span>
              </div>
            )}

            {/* OTP Input */}
            <div style={{ marginBottom: 24 }}>
              <OtpInput onComplete={setOtp} />
            </div>

            {/* Verify button */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || otp.replace(/\D/g, '').length < 6}
              style={{
                width: '100%', padding: '14px', border: 'none', borderRadius: 14, cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'inherit',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1,#3b82f6)',
                backgroundSize: '200% 200%',
                boxShadow: '0 6px 24px rgba(79,70,229,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                transition: 'transform .15s, box-shadow .2s, opacity .15s',
                opacity: isLoading || otp.replace(/\D/g, '').length < 6 ? .55 : 1,
                animation: !isLoading && otp.replace(/\D/g, '').length === 6 ? 'gradMove 2s ease infinite' : 'none',
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget.style.transform = 'translateY(-2px)'); }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isLoading
                ? <><span style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Đang xác minh...</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>Xác minh ngay</>
              }
            </button>

            {/* Resend */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                {email ? `Không nhận được mã? Kiểm tra thư mục spam hoặc` : 'Không nhận được mã?'}
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading || !pendingToken || resendCount > 0}
                style={{
                  background: 'none', border: 'none', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600,
                  color: resendCount > 0 || !pendingToken ? '#9ca3af' : '#6366f1',
                  cursor: resendCount > 0 ? 'default' : 'pointer',
                  padding: 0, transition: 'color .15s',
                }}
                onMouseEnter={e => { if (resendCount === 0) (e.currentTarget.style.color = '#4f46e5'); }}
                onMouseLeave={e => { e.currentTarget.style.color = resendCount > 0 ? '#9ca3af' : '#6366f1'; }}
              >
                {resendCount > 0 ? `Gửi lại sau ${resendCount}s` : 'Gửi lại mã'}
              </button>
            </div>

          </div>

          {/* Back to login */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a
              href="/login"
              style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
              Quay lại đăng nhập
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
