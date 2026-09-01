import React, { useEffect, useState, useRef } from 'react';
import icEnvelope from '@/assets/icons/notification-envelope.png';

interface ToastNotification {
  id: string;
  title: string;
  body?: string;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

// ICQ-style sound using Web Audio API
function playICQSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number, vol = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    // ICQ "uh-oh" — two descending tones
    playTone(880, 0, 0.12, 0.25);
    playTone(660, 0.14, 0.12, 0.2);
    playTone(440, 0.28, 0.18, 0.22);
  } catch {
    // Audio not supported — silent fallback
  }
}

function SingleToast({ notif, onDismiss }: { notif: ToastNotification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Play ICQ sound
    playICQSound();
    // Auto dismiss after 10s
    timerRef.current = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 400);
    }, 10000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLeaving(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(20,25,70,0.97), rgba(30,40,100,0.97))',
        border: '1px solid rgba(99,102,241,0.55)',
        borderLeft: '4px solid #6366f1',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        cursor: 'pointer',
        maxWidth: 340,
        minWidth: 260,
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(165,180,252,0.6), transparent)',
        animation: 'toast-shimmer 2s linear infinite',
      }} />

      {/* Envelope icon */}
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(99,102,241,0.15)',
        borderRadius: 12,
        border: '1px solid rgba(99,102,241,0.3)',
      }}>
        <img src={icEnvelope} width={32} height={32} style={{ display: 'block' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {notif.title}
        </div>
        {notif.body && (
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {notif.body}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginTop: 6 }}>
          Нажмите для закрытия
        </div>
      </div>

      {/* Close btn */}
      <button
        onClick={e => { e.stopPropagation(); handleDismiss(); }}
        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0, borderRadius: 6, transition: 'color 0.1s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >✕</button>

      <style>{`
        @keyframes toast-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 52,
      right: 12,
      zIndex: 999985,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {notifications.map(notif => (
        <div key={notif.id} style={{ pointerEvents: 'auto' }}>
          <SingleToast notif={notif} onDismiss={() => onDismiss(notif.id)} />
        </div>
      ))}
    </div>
  );
}
