'use client';

import { useEffect, useRef } from 'react';

export default function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      ox: 0, oy: 0,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.6 + 0.4,
      parallax: Math.random() * 0.014 + 0.003,
    }));

    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const tx = (mx - cx) * p.parallax;
        const ty = (my - cy) * p.parallax;
        p.ox += (tx - p.ox) * 0.04;
        p.oy += (ty - p.oy) * 0.04;
        const rx = p.x + p.ox;
        const ry = p.y + p.oy;
        ctx.beginPath();
        ctx.arc(rx, ry, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.45)';
        ctx.fill();
      }

      for (let i = 0; i < pts.length; i++) {
        const ax = pts[i].x + pts[i].ox;
        const ay = pts[i].y + pts[i].oy;
        for (let j = i + 1; j < pts.length; j++) {
          const bx = pts[j].x + pts[j].ox;
          const by = pts[j].y + pts[j].oy;
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.55,
      }}
    />
  );
}