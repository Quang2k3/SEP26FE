'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login as loginService, getValidSession } from '@/services/authService';

/* ─── fullscreen particle canvas with mouse parallax ─── */
function ParticleCanvas({ style }: { style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let mx = 0, my = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const pts = Array.from({ length: 72 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      ox: 0, oy: 0,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
      r: Math.random() * 1.8 + .3,
      parallax: Math.random() * .018 + .004,
    }));
    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMouse);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const tx = (mx - cx) * p.parallax, ty = (my - cy) * p.parallax;
        p.ox += (tx - p.ox) * .04; p.oy += (ty - p.oy) * .04;
        const rx = p.x + p.ox, ry = p.y + p.oy;
        ctx.beginPath(); ctx.arc(rx, ry, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,.35)'; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        const ax = pts[i].x + pts[i].ox, ay = pts[i].y + pts[i].oy;
        for (let j = i + 1; j < pts.length; j++) {
          const bx = pts[j].x + pts[j].ox, by = pts[j].y + pts[j].oy;
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(99,102,241,${.1 * (1 - d / 110)})`; ctx.lineWidth = .7; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }} />;
}

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [shake,    setShake]    = useState(false);

  useEffect(() => {
    const s = getValidSession();
    if (s) router.replace('/dashboard');
    else setChecking(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await loginService({ email, password, rememberMe: false });
      const data = result.raw?.data;
      if (data?.requiresVerification) {
        if (data.pendingToken) localStorage.setItem('pending_token', data.pendingToken);
        localStorage.setItem('pending_email', email);
        router.push('/verify-email');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Email hoặc mật khẩu không chính xác.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#eef2ff 0%,#f0f4ff 50%,#e8f0fe 100%)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22 }}>warehouse</span>
      </div>
    </div>
  );

  const STATS = [
    { icon: 'input_circle',  val: '1,284', lbl: 'Nhập kho',    color: '#4f46e5', delay: '0s'   },
    { icon: 'inventory_2',   val: '78%',   lbl: 'Bin sử dụng', color: '#0891b2', delay: '.15s' },
    { icon: 'output_circle', val: '942',   lbl: 'Xuất kho',    color: '#7c3aed', delay: '.3s'  },
    { icon: 'verified',      val: '99%',   lbl: 'QC pass',     color: '#059669', delay: '.45s' },
  ];

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp   {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn  {from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
        @keyframes shake    {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
        @keyframes float0   {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes float1   {0%,100%{transform:translateY(-6px)}50%{transform:translateY(6px)}}
        @keyframes float2   {0%,100%{transform:translateY(-4px)}50%{transform:translateY(8px)}}
        @keyframes float3   {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes spin     {to{transform:rotate(360deg)}}
        @keyframes pulse    {0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}70%{box-shadow:0 0 0 10px rgba(99,102,241,0)}}
        @keyframes gradMove {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .inp {
          width:100%; padding:15px 16px 15px 50px; font-size:15px; font-family:inherit;
          border:1.5px solid #e0e7ff; border-radius:14px;
          background:#f8faff; color:#111827;
          outline:none; transition:border .2s, background .2s, box-shadow .2s;
        }
        .inp::placeholder{color:#9ca3af}
        .inp:hover{border-color:#a5b4fc;background:#f5f7ff}
        .inp:focus{border-color:#6366f1;background:#ffffff;box-shadow:0 0 0 4px rgba(99,102,241,.12)}
        .inp-pw{padding-right:50px}
        .lbl{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;letter-spacing:.01em}
        .submit-btn{
          width:100%;padding:16px;border:none;border-radius:14px;cursor:pointer;
          font-size:16px;font-weight:700;color:white;font-family:inherit;
          background:linear-gradient(135deg,#4f46e5,#6366f1,#3b82f6);
          background-size:200% 200%;
          box-shadow:0 6px 24px rgba(79,70,229,.35);
          transition:transform .15s,box-shadow .2s;
          display:flex;align-items:center;justify-content:center;gap:10px;
        }
        .submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(79,70,229,.45);animation:gradMove 2s ease infinite}
        .submit-btn:active:not(:disabled){transform:translateY(0)}
        .submit-btn:disabled{opacity:.55;cursor:not-allowed}
        .stat-chip{
          display:flex;align-items:center;gap:10px;padding:10px 15px;
          border-radius:12px;background:rgba(255,255,255,.85);
          border:1px solid rgba(99,102,241,.12);
          box-shadow:0 2px 8px rgba(99,102,241,.08);
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter',system-ui,sans-serif", position: 'relative', background: 'linear-gradient(145deg,#eef2ff 0%,#f0f4ff 50%,#e8f0fe 100%)' }}>
        <ParticleCanvas />

        {/* ════ LEFT ════ */}
        <div style={{
          width: '46%', minWidth: 420, flexShrink: 0, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '40px 48px',
        }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.10),transparent 70%)' }} />
          </div>
          <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,.1),transparent)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px rgba(99,102,241,.12)', animation: 'pulse 2.5s ease-in-out infinite' }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22 }}>warehouse</span>
              </div>
              <span style={{ color: '#1e1b4b', fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>WMS Portal</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, paddingBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
                {STATS.map((s, i) => (
                  <div key={i} className="stat-chip" style={{ animation: `float${i} ${3 + i * .3}s ease-in-out infinite`, animationDelay: s.delay }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                    </div>
                    <div>
                      <div style={{ color: '#111827', fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{s.lbl}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: '0 0 14px', fontSize: 30, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-.6px', color: '#111827' }}>
                  Quản lý kho hàng<br />
                  <span style={{ background: 'linear-gradient(90deg,#4f46e5,#3b82f6,#0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200%', animation: 'gradMove 4s ease infinite' }}>
                    thông minh &amp; hiệu quả
                  </span>
                </h1>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
                  Kiểm soát inbound · outbound · QC<br />và báo cáo tập trung từ một nơi duy nhất.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: 'qr_code_scanner', label: 'QR Scan' },
                { icon: 'analytics',       label: 'Analytics' },
                { icon: 'shield',          label: 'Bảo mật' },
              ].map(f => (
                <div key={f.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 6px', borderRadius: 11, background: 'rgba(255,255,255,.7)', border: '1px solid rgba(99,102,241,.1)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#6366f1' }}>{f.icon}</span>
                  <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ RIGHT — FORM ════ */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.08),transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,.07),transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1, animation: 'scaleIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
            <div style={{
              background: 'rgba(255,255,255,.92)',
              border: '1px solid rgba(99,102,241,.12)',
              borderRadius: 28, padding: '48px 44px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 32px 80px rgba(99,102,241,.12), 0 0 0 1px rgba(255,255,255,.8) inset',
            }}>
              {/* top accent */}
              <div style={{ position: 'absolute', top: 0, left: 44, right: 44, height: 2, borderRadius: '0 0 4px 4px', background: 'linear-gradient(90deg,#4f46e5,#818cf8,#3b82f6)' }} />

              {/* header */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(79,70,229,.3)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 24 }}>warehouse</span>
                  </div>
                  <div>
                    <div style={{ color: '#6366f1', fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>WMS Portal</div>
                    <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>Warehouse Management</div>
                  </div>
                </div>
                <h2 style={{ color: '#111827', fontSize: 30, fontWeight: 800, letterSpacing: '-.5px', margin: '0 0 8px' }}>Chào mừng trở lại</h2>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5, margin: 0 }}>Đăng nhập để tiếp tục quản lý kho hàng</p>
              </div>

              {/* error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', marginBottom: 24,
                  borderRadius: 12, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)',
                  animation: shake ? 'shake .5s ease' : 'none',
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 18, flexShrink: 0 }}>error</span>
                  <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 500 }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* email */}
                <div>
                  <label className="lbl">Email</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 19, color: '#9ca3af', pointerEvents: 'none' }}>mail</span>
                    <input className="inp" type="email" required autoComplete="email"
                      placeholder="email@company.com"
                      value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                  </div>
                </div>

                {/* password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="lbl" style={{ margin: 0 }}>Mật khẩu</label>
                    <Link href="/forgot-password" style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 19, color: '#9ca3af', pointerEvents: 'none' }}>lock</span>
                    <input className="inp inp-pw" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2, transition: 'color .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                      <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{showPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ paddingTop: 6 }}>
                  <button type="submit" className="submit-btn" disabled={loading || !email || !password}>
                    {loading
                      ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Đang xác thực...</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>Đăng nhập</>
                    }
                  </button>
                </div>
              </form>

              <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d1d5db' }}>shield</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Hệ thống nội bộ — chỉ dành cho nhân viên được cấp quyền</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
