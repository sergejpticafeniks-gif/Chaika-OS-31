import React, { useState, useRef, useEffect } from 'react';

interface AIButtonProps {
  onClick: () => void;
  onClose: () => void;
  visible: boolean;
}

export default function AIAssistantButton({ onClick, onClose, visible }: AIButtonProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 160, y: 60 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wasDragged, setWasDragged] = useState(false);
  const frameRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-close]')) return;
    setDragging(true);
    setWasDragged(false);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setWasDragged(true);
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const nx = Math.max(0, Math.min(window.innerWidth - 130, e.clientX - dragOffset.x));
        const ny = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y));
        setPos({ x: nx, y: ny });
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, dragOffset]);

  const handleClick = () => { if (!wasDragged) onClick(); };

  if (!visible) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 999989,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Glowing blue circle — 30% larger than before (56→73px) */}
      <div style={{
        width: 73,
        height: 73,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
        boxShadow: '0 0 24px rgba(59,130,246,0.85), 0 0 50px rgba(59,130,246,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'ai-btn-pulse 2s ease-in-out infinite',
        position: 'relative',
        border: '2.5px solid rgba(147,197,253,0.65)',
      }}>
        {/* Close button */}
        <button
          data-close="true"
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{
            position: 'absolute',
            top: -7, right: -7,
            width: 20, height: 20,
            borderRadius: '50%',
            background: 'rgba(220,50,50,0.92)',
            border: 'none',
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            lineHeight: 1,
            zIndex: 1,
          }}
        >✕</button>
      </div>

      {/* Label */}
      <div style={{
        background: 'rgba(10,30,80,0.93)',
        border: '1px solid rgba(59,130,246,0.55)',
        borderRadius: 9,
        padding: '4px 10px',
        fontSize: 10,
        color: '#93c5fd',
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        Помощь и поиск AI
      </div>

      <style>{`
        @keyframes ai-btn-pulse {
          0%, 100% {
            box-shadow: 0 0 24px rgba(59,130,246,0.85), 0 0 50px rgba(59,130,246,0.45);
          }
          50% {
            box-shadow: 0 0 36px rgba(59,130,246,1), 0 0 70px rgba(59,130,246,0.65), 0 0 90px rgba(96,165,250,0.35);
          }
        }
      `}</style>
    </div>
  );
}
