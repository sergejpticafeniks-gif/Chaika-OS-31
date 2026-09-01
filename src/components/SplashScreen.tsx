import React, { useEffect, useState } from 'react';
import icChaikaLogo from '@/assets/icons/chaika-logo.png';

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible');

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fading'), 2600);
    const doneTimer = setTimeout(() => { setPhase('done'); onDone(); }, 3800);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  if (phase === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'fading' ? 0 : 1,
        transition: phase === 'fading' ? 'opacity 1.2s ease-out' : 'none',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Starry sky background */}
      <div style={{ position: 'absolute', inset: 0, background: 'url(/wallpaper.jpg) center/cover no-repeat' }} />
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(2,8,30,0.6) 0%, rgba(0,0,0,0.88) 100%)' }} />

      {/* Flying seagull animation */}
      <div style={{
        position: 'absolute', top: '30%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        animation: 'seagullFly 2.6s ease-in-out forwards',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 52, filter: 'drop-shadow(0 0 18px rgba(120,200,255,0.8)) drop-shadow(0 0 40px rgba(80,160,255,0.4))' }}>
          🕊️
        </div>
      </div>

      {/* Stars particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() > 0.7 ? 3 : 2,
            height: Math.random() > 0.7 ? 3 : 2,
            background: '#fff',
            borderRadius: '50%',
            opacity: 0,
            animation: `starTwinkle ${1 + Math.random() * 2}s ${Math.random() * 1.5}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'splashFadeIn 0.8s ease-out forwards',
      }}>
        {/* Logo */}
        <div style={{
          position: 'relative', width: 110, height: 110,
          animation: 'splashLogoFloat 3s ease-in-out infinite alternate',
        }}>
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            background: 'conic-gradient(rgba(129,140,248,0.95) 0deg, rgba(167,139,250,0.95) 120deg, rgba(96,165,250,0.95) 240deg, rgba(129,140,248,0.95) 360deg)',
            boxShadow: '0 0 60px rgba(129,140,248,0.7), 0 0 120px rgba(167,139,250,0.4)',
            animation: 'splashRing 4s linear infinite',
            filter: 'blur(1px)',
          }} />
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid rgba(120,200,255,0.5)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 0 30px rgba(80,160,255,0.3)',
            background: 'rgba(10,20,50,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={icChaikaLogo} alt="Чайка" style={{ width: '80%', height: '80%', objectFit: 'cover', borderRadius: '50%' }} />
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 60, fontWeight: 800, color: '#fff',
          fontFamily: "'Segoe UI', Tahoma, sans-serif",
          letterSpacing: 6,
          background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #60a5fa 65%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 30px rgba(120,180,255,0.6))',
          lineHeight: 1,
        }}>
          ЧАЙКА
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 13, fontWeight: 300, color: 'rgba(180,210,255,0.75)',
          letterSpacing: 6, textTransform: 'uppercase',
          fontFamily: "'Segoe UI', sans-serif",
          textShadow: '0 2px 12px rgba(80,160,255,0.5)',
        }}>
          Облачная Операционная Система
        </div>

        {/* Loading bar */}
        <div style={{ width: 240, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, transparent, #818cf8 25%, #a78bfa 50%, #60a5fa 75%, transparent)',
            borderRadius: 2,
            animation: 'splashBar 1.6s ease-in-out infinite',
          }} />
        </div>

        {/* App ticker */}
        <div style={{ overflow: 'hidden', width: 340, position: 'relative', height: 18, marginTop: 4 }}>
          <div style={{ position: 'absolute', whiteSpace: 'nowrap', fontSize: 11, color: 'rgba(150,190,255,0.55)', letterSpacing: 2, fontFamily: "'Segoe UI', monospace", animation: 'appTicker 10s linear infinite' }}>
            BJS · BIN · BioLab · RubiCAD · Треугольник · КонструкторПлат · АДТ · МаркетПлюс · INI.framework · Кнопочки · Я-Россия · Вагнер · DOC · Мессенджер
          </div>
        </div>
        {/* Version */}
        <div style={{ fontSize: 11, color: 'rgba(150,180,220,0.45)', letterSpacing: 4, fontFamily: "'Segoe UI', sans-serif", marginTop: 4 }}>
          ВЕРСИЯ 31 · 2026
        </div>
      </div>

      <style>{`
        @keyframes splashBar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes splashRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashLogoFloat {
          from { transform: translateY(0px); }
          to   { transform: translateY(-8px); }
        }
        @keyframes seagullFly {
          0%   { transform: translateX(-60vw) translateY(30px) scale(0.5); opacity: 0; }
          20%  { opacity: 1; }
          60%  { transform: translateX(0vw) translateY(-10px) scale(1); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(60vw) translateY(-30px) scale(0.6); opacity: 0; }
        }
        @keyframes starTwinkle {
          from { opacity: 0.1; }
          to   { opacity: 0.9; }
        }
        @keyframes appTicker {
          0%   { transform: translateX(340px); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
