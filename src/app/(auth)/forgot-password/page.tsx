'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestPasswordReset, resetPassword } from '@/services/authService';

type Step = 'REQUEST_EMAIL' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'SUCCESS';

/* ── password strength ── */
function PwStrengthBar({ pw }: { pw: string }) {
  const checks = [
    { label: '8+ ký tự',       ok: pw.length >= 8 },
    { label: 'Chữ hoa',         ok: /[A-Z]/.test(pw) },
    { label: 'Số',              ok: /[0-9]/.test(pw) },
    { label: 'Ký tự đặc biệt', ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
  const labels = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
  if (!pw) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < score ? colors[score] : '#e5e7eb', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize: 10, color: c.ok ? '#059669' : '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{c.ok ? 'check_circle' : 'radio_button_unchecked'}</span>
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: colors[score] }}>{labels[score]}</span>}
      </div>
    </div>
  );
}

/* ── 6-box OTP input ── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const next = digits.map((d, j) => j === i ? '' : d);
      onChange(next.join(''));
      if (i > 0) refs.current[i - 1]?.focus();
    }
  };
  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, j) => j === i ? char : d);
    onChange(next.join(''));
    if (char && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(raw.padEnd(6, ''));
    refs.current[Math.min(raw.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
            border: digits[i] ? '1.5px solid #6366f1' : '1.5px solid #e0e7ff',
            borderRadius: 12,
            background: digits[i] ? '#eef2ff' : '#f8faff',
            color: '#111827', outline: 'none', fontFamily: 'monospace',
            transition: 'border .15s, background .15s',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  );
}

/* ── step indicator ── */
function Steps({ current }: { current: Step }) {
  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'REQUEST_EMAIL',  label: 'Email',    icon: 'mail'    },
    { id: 'VERIFY_OTP',     label: 'Xác minh', icon: 'dialpad' },
    { id: 'RESET_PASSWORD', label: 'Mật khẩu', icon: 'key'     },
  ];
  const idx = steps.findIndex(s => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#4f46e5' : active ? '#eef2ff' : '#f3f4f6',
                border: active ? '2px solid #6366f1' : done ? '2px solid #4f46e5' : '1.5px solid #e5e7eb',
                transition: 'all .3s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: done ? 'white' : active ? '#4f46e5' : '#9ca3af' }}>
                  {done ? 'check' : s.icon}
                </span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#4f46e5' : done ? '#6b7280' : '#9ca3af', letterSpacing: '.03em' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 48, height: 1.5, background: done ? '#4f46e5' : '#e5e7eb', marginBottom: 20, transition: 'background .3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step,   setStep]   = useState<Step>('REQUEST_EMAIL');
  const [email,  setEmail]  = useState('');
  const [otp,    setOtp]    = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep('VERIFY_OTP');
      setResendCountdown(60);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi yêu cầu. Thử lại.');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (otp.replace(/\D/g, '').length < 6) { setError('Vui lòng nhập đủ 6 chữ số.'); return; }
    setStep('RESET_PASSWORD');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPw !== confPw) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (newPw.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
    setLoading(true);
    try {
      await resetPassword({ email, otp, newPassword: newPw, confirmPassword: confPw });
      setStep('SUCCESS');
      setTimeout(() => router.push('/login'), 2800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setLoading(true); setError('');
    try {
      await requestPasswordReset(email);
      setResendCountdown(60);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi lại mã.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn {from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes gradMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes checkPop{0%{transform:scale(0) rotate(-20deg)}70%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes ripple  {from{transform:scale(.8);opacity:.5}to{transform:scale(2.4);opacity:0}}
        @keyframes float   {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .inp {
          width:100%; padding:13px 14px 13px 46px; font-size:14px; font-family:inherit;
          border:1.5px solid #e0e7ff; border-radius:12px;
          background:#f8faff; color:#111827;
          outline:none; transition:border .2s, background .2s, box-shadow .2s;
        }
        .inp::placeholder{color:#9ca3af;font-size:13px}
        .inp:hover{border-color:#a5b4fc;background:#f5f7ff}
        .inp:focus{border-color:#6366f1;background:#ffffff;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
        .inp-pw{padding-right:46px}
        .lbl{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:7px;letter-spacing:.01em}
        .btn{
          width:100%;padding:13px;border:none;border-radius:12px;cursor:pointer;
          font-size:14px;font-weight:700;color:white;font-family:inherit;
          background:linear-gradient(135deg,#4f46e5,#6366f1,#3b82f6);background-size:200%;
          box-shadow:0 6px 24px rgba(79,70,229,.3);
          transition:transform .15s,box-shadow .2s;
          display:flex;align-items:center;justify-content:center;gap:9px;
        }
        .btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(79,70,229,.4);animation:gradMove 2s infinite}
        .btn:active:not(:disabled){transform:translateY(0)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter',system-ui,sans-serif",
        background: 'linear-gradient(145deg,#eef2ff 0%,#f0f4ff 50%,#e8f0fe 100%)',
        position: 'relative', overflow: 'hidden', padding: '24px 16px',
      }}>
        {/* background glows */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.08),transparent 70%)' }} />
          {/* dot grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: .35, backgroundImage: 'radial-gradient(circle,rgba(99,102,241,.25) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        {/* floating chips */}
        <div style={{ position: 'absolute', top: '12%', left: '8%', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(99,102,241,.12)', boxShadow: '0 4px 16px rgba(99,102,241,.08)', display: 'flex', alignItems: 'center', gap: 7, animation: 'float 3.5s ease-in-out infinite', fontSize: 12, color: '#4b5563', fontFamily: "'Inter',system-ui,sans-serif" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#4f46e5' }}>security</span>
          Mã hoá 256-bit
        </div>
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(99,102,241,.12)', boxShadow: '0 4px 16px rgba(99,102,241,.08)', display: 'flex', alignItems: 'center', gap: 7, animation: 'float 4s ease-in-out infinite .5s', fontSize: 12, color: '#4b5563', fontFamily: "'Inter',system-ui,sans-serif" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#059669' }}>verified_user</span>
          Xác minh 2 bước
        </div>

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 19 }}>warehouse</span>
            </div>
            <span style={{ color: '#1e1b4b', fontSize: 16, fontWeight: 800 }}>WMS Portal</span>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,.92)',
            border: '1px solid rgba(99,102,241,.1)',
            borderRadius: 24, padding: '36px 36px 32px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(99,102,241,.1)',
            animation: 'scaleIn .4s cubic-bezier(.34,1.56,.64,1) both',
            position: 'relative',
          }}>
            {/* top accent */}
            <div style={{ position: 'absolute', top: 0, left: 36, right: 36, height: 2, borderRadius: '0 0 4px 4px', background: 'linear-gradient(90deg,#4f46e5,#818cf8,#3b82f6)' }} />

            {/* Step indicators */}
            {step !== 'SUCCESS' && <Steps current={step} />}

            {/* ── SUCCESS ── */}
            {step === 'SUCCESS' && (
              <div style={{ textAlign: 'center', padding: '12px 0 8px', animation: 'fadeUp .4s ease' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16,185,129,.15)', animation: 'ripple 1.5s ease-out infinite' }} />
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ecfdf5', border: '2px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'checkPop .5s cubic-bezier(.34,1.56,.64,1) both' }}>
                    <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: 36 }}>check_circle</span>
                  </div>
                </div>
                <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Đặt lại thành công!</h2>
                <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  Mật khẩu của bạn đã được cập nhật.<br />Đang chuyển về trang đăng nhập...
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 160, height: 3, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#4f46e5,#10b981)', borderRadius: 99, animation: 'progress 2.8s linear forwards' }} />
                  </div>
                </div>
                <style>{`@keyframes progress{from{width:0}to{width:100%}}`}</style>
              </div>
            )}

            {/* ── STEP 1: EMAIL ── */}
            {step === 'REQUEST_EMAIL' && (
              <div style={{ animation: 'fadeUp .3s ease' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 800, letterSpacing: '-.4px', marginBottom: 6 }}>Quên mật khẩu?</h2>
                  <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
                    Nhập email đã đăng ký — chúng tôi sẽ gửi mã xác minh 6 số.
                  </p>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 13px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>error</span>{error}
                  </div>
                )}

                <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="lbl">Địa chỉ email</label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: '#9ca3af', pointerEvents: 'none' }}>mail</span>
                      <input className="inp" type="email" required autoComplete="email"
                        placeholder="email@company.com"
                        value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                    </div>
                  </div>
                  <button type="submit" className="btn" disabled={loading || !email}>
                    {loading
                      ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Đang gửi...</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 17 }}>send</span>Gửi mã xác minh</>
                    }
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'VERIFY_OTP' && (
              <div style={{ animation: 'fadeUp .3s ease' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 800, letterSpacing: '-.4px', marginBottom: 6 }}>Kiểm tra email</h2>
                  <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
                    Đã gửi mã 6 số tới <span style={{ color: '#4f46e5', fontWeight: 600 }}>{email}</span>
                  </p>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 13px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>error</span>{error}
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="lbl" style={{ textAlign: 'center', display: 'block', marginBottom: 16 }}>Mã xác minh</label>
                    <OtpInput value={otp} onChange={setOtp} />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button type="button" onClick={handleResend} disabled={resendCountdown > 0 || loading}
                      style={{ background: 'none', border: 'none', cursor: resendCountdown > 0 ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, color: resendCountdown > 0 ? '#9ca3af' : '#6366f1', fontWeight: 600, padding: 0 }}>
                      {resendCountdown > 0 ? `Gửi lại sau ${resendCountdown}s` : 'Không nhận được? Gửi lại'}
                    </button>
                  </div>

                  <button type="submit" className="btn" disabled={loading || otp.replace(/\D/g, '').length < 6}>
                    {loading
                      ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Đang xác minh...</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 17 }}>verified</span>Xác minh mã</>
                    }
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 3: NEW PASSWORD ── */}
            {step === 'RESET_PASSWORD' && (
              <div style={{ animation: 'fadeUp .3s ease' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ color: '#111827', fontSize: 22, fontWeight: 800, letterSpacing: '-.4px', marginBottom: 6 }}>Đặt mật khẩu mới</h2>
                  <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>Tạo mật khẩu mạnh và không dùng lại mật khẩu cũ.</p>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 13px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0 }}>error</span>{error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="lbl">Mật khẩu mới</label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: '#9ca3af', pointerEvents: 'none' }}>lock</span>
                      <input className="inp inp-pw" type={showPw ? 'text' : 'password'} required minLength={8}
                        placeholder="Ít nhất 8 ký tự"
                        value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }} />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{showPw ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <PwStrengthBar pw={newPw} />
                  </div>

                  <div>
                    <label className="lbl">Xác nhận mật khẩu</label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{
                        position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 17, pointerEvents: 'none',
                        color: confPw && confPw !== newPw ? '#ef4444' : confPw && confPw === newPw ? '#10b981' : '#9ca3af',
                      }}>lock</span>
                      <input className="inp inp-pw" type={showCf ? 'text' : 'password'} required
                        placeholder="Nhập lại mật khẩu"
                        style={{ borderColor: confPw && confPw !== newPw ? 'rgba(239,68,68,.4)' : confPw && confPw === newPw ? 'rgba(16,185,129,.4)' : undefined }}
                        value={confPw} onChange={e => { setConfPw(e.target.value); setError(''); }} />
                      <button type="button" tabIndex={-1} onClick={() => setShowCf(v => !v)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{showCf ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {confPw && confPw === newPw && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, color: '#10b981', fontSize: 12 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>Mật khẩu khớp
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: 4 }}>
                    <button type="submit" className="btn" disabled={loading || !newPw || !confPw}>
                      {loading
                        ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Đang cập nhật...</>
                        : <><span className="material-symbols-outlined" style={{ fontSize: 17 }}>lock_reset</span>Đặt lại mật khẩu</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* back link */}
            {step !== 'SUCCESS' && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
                <Link
                  href={step === 'REQUEST_EMAIL' ? '/login' : '#'}
                  onClick={step !== 'REQUEST_EMAIL' ? (e) => { e.preventDefault(); setStep(step === 'VERIFY_OTP' ? 'REQUEST_EMAIL' : 'VERIFY_OTP'); setError(''); } : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af', textDecoration: 'none', fontWeight: 500, transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#4f46e5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
                  {step === 'REQUEST_EMAIL' ? 'Quay lại đăng nhập' : 'Quay lại bước trước'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
