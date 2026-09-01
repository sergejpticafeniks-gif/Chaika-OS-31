import React, { useRef, useCallback, ReactNode, useState, useEffect } from 'react';
import { AppWindow } from '@/types';
import { getAppIcon } from '@/lib/iconMap';
import icWebApp from '@/assets/icons/webapp.png';

interface WindowProps {
  win: AppWindow;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number, x: number, y: number) => void;
  isActive: boolean;
}

export default function Window({
  win, children, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, isActive
}: WindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ edge: string; startX: number; startY: number; winX: number; winY: number; winW: number; winH: number } | null>(null);

  // Animation state: 'opening' | 'open' | 'closing'
  const [animState, setAnimState] = useState<'opening' | 'open' | 'closing'>('opening');
  const closeCalledRef = useRef(false);

  useEffect(() => {
    // After opening animation completes, switch to 'open'
    const t = setTimeout(() => setAnimState('open'), 160);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    if (closeCalledRef.current) return;
    closeCalledRef.current = true;
    setAnimState('closing');
    setTimeout(() => onClose(), 130);
  }, [onClose]);

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (win.isMaximized) return;
    e.preventDefault();
    onFocus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onMove(Math.max(0, dragRef.current.winX + dx), Math.max(0, dragRef.current.winY + dy));
    };
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [win, onFocus, onMove]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, edge: string) => {
    if (win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    resizeRef.current = { edge, startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y, winW: win.width, winH: win.height };

    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { edge, startX, startY, winX, winY, winW, winH } = resizeRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newX = winX, newY = winY, newW = winW, newH = winH;
      if (edge.includes('e')) newW = Math.max(win.minWidth, winW + dx);
      if (edge.includes('s')) newH = Math.max(win.minHeight, winH + dy);
      if (edge.includes('w')) { newW = Math.max(win.minWidth, winW - dx); newX = winX + winW - newW; }
      if (edge.includes('n')) { newH = Math.max(win.minHeight, winH - dy); newY = winY + winH - newH; }
      onResize(newW, newH, newX, newY);
    };
    const onMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [win, onFocus, onResize]);

  if (win.isMinimized) return null;

  const style: React.CSSProperties = win.isMaximized ? {
    position: 'fixed', left: 0, top: 0, width: '100vw',
    height: `calc(100vh - 44px)`, zIndex: win.zIndex,
  } : {
    position: 'fixed', left: win.x, top: win.y,
    width: win.width, height: win.height, zIndex: win.zIndex,
  };

  const iconSrc = (win as any).customLogoUrl || getAppIcon(win.appId);
  const hasValidPng = iconSrc && !iconSrc.startsWith('data:');

  // Animation class
  const animClass =
    animState === 'opening' ? 'window-opening' :
    animState === 'closing' ? 'window-closing' : '';

  return (
    <div
      style={style}
      className={`window-frame ${isActive ? 'window-active' : 'window-inactive'} ${animClass}`}
      onMouseDown={onFocus}
    >
      {/* Resize handles */}
      {!win.isMaximized && (
        <>
          <div className="resize-handle resize-n" onMouseDown={e => handleResizeMouseDown(e, 'n')} />
          <div className="resize-handle resize-s" onMouseDown={e => handleResizeMouseDown(e, 's')} />
          <div className="resize-handle resize-e" onMouseDown={e => handleResizeMouseDown(e, 'e')} />
          <div className="resize-handle resize-w" onMouseDown={e => handleResizeMouseDown(e, 'w')} />
          <div className="resize-handle resize-ne" onMouseDown={e => handleResizeMouseDown(e, 'ne')} />
          <div className="resize-handle resize-nw" onMouseDown={e => handleResizeMouseDown(e, 'nw')} />
          <div className="resize-handle resize-se" onMouseDown={e => handleResizeMouseDown(e, 'se')} />
          <div className="resize-handle resize-sw" onMouseDown={e => handleResizeMouseDown(e, 'sw')} />
        </>
      )}

      {/* Title bar */}
      <div
        className={`window-titlebar ${isActive ? 'titlebar-active' : 'titlebar-inactive'}`}
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={onMaximize}
      >
        <div className="titlebar-left">
          <span className="titlebar-icon">
            {hasValidPng ? (
              <img
                src={iconSrc}
                alt=""
                width={16}
                height={16}
                style={{ objectFit: 'cover', borderRadius: 3 }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = icWebApp; }}
              />
            ) : (
              <span style={{ fontSize: 13 }}>{win.icon}</span>
            )}
          </span>
          <span className="titlebar-title">{win.title}</span>
        </div>

        <div className="titlebar-buttons">
          <button
            className="win-btn win-minimize"
            onClick={e => { e.stopPropagation(); onMinimize(); }}
            title="Свернуть"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            className="win-btn win-maximize"
            onClick={e => { e.stopPropagation(); onMaximize(); }}
            title={win.isMaximized ? 'Восстановить' : 'Развернуть'}
          >
            {win.isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 0H10V7H7V10H0V3H3V0Z" stroke="currentColor" strokeWidth="1" fill="none"/>
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" fill="none" />
              </svg>
            )}
          </button>
          <button
            className="win-btn win-close"
            onClick={e => { e.stopPropagation(); handleClose(); }}
            title="Закрыть"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="window-content" style={{ userSelect: 'text' }}>
        {children}
      </div>
    </div>
  );
}
