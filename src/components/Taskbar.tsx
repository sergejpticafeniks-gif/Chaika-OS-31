import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AppWindow } from '@/types';
import { getAppIcon } from '@/lib/iconMap';
import icWebApp from '@/assets/icons/webapp.png';
import icLogo from '@/assets/icons/chaika-logo.png';
import icBell from '@/assets/icons/tray-bell.png';
import icNetwork from '@/assets/icons/tray-network.png';
import icSound from '@/assets/icons/tray-sound.png';
import icUser from '@/assets/icons/tray-user.png';
import icIndex from '@/assets/icons/tray-index.png';
import icUpload from '@/assets/icons/tray-upload.png';

interface TaskbarProps {
  windows: AppWindow[];
  onWindowClick: (id: string) => void;
  onStartClick: () => void;
  showStart: boolean;
  activeWindowId: string | null;
  onUploadFile?: () => void;
  onLogout?: () => void;
  userName?: string;
  unreadCount?: number;
  onNotificationClick?: (e: React.MouseEvent) => void;
  onIndexWidgetClick?: (e: React.MouseEvent) => void;
  haspStatus?: 'unknown' | 'found' | 'not_found';
  onHaspClick?: (e: React.MouseEvent) => void;
  onOpenPassport?: () => void;
}

export default function Taskbar({
  windows, onWindowClick, onStartClick, showStart, activeWindowId,
  onUploadFile, onLogout, userName,
  unreadCount = 0, onNotificationClick, onIndexWidgetClick,
  haspStatus = 'unknown', onHaspClick, onOpenPassport,
}: TaskbarProps) {
  const [time, setTime] = useState(new Date());
  const [notifPulse, setNotifPulse] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_id?: string; email?: string; is_admin?: boolean } | null>(null);
  const [oauthCount, setOauthCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setShowUserCard(false);
    };
    if (showUserCard) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserCard]);

  const openUserCard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showUserCard) { setShowUserCard(false); return; }
    setShowUserCard(true);
    if (!userProfile) {
      const { data } = await supabase.from('user_profiles').select('display_id,email,is_admin').eq('id', (await supabase.auth.getUser()).data.user?.id || '').single();
      if (data) setUserProfile(data);
      const { count } = await supabase.from('oauth_clients').select('id', { count: 'exact', head: true }).eq('created_by', (await supabase.auth.getUser()).data.user?.id || '');
      setOauthCount(count || 0);
    }
  };

  useEffect(() => {
    if (unreadCount > 0) {
      setNotifPulse(true);
      const t = setTimeout(() => setNotifPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const haspTitle = haspStatus === 'found'
    ? 'HASP-ключ активен — нажмите для управления'
    : haspStatus === 'not_found'
    ? 'HASP-ключ не найден — нажмите для диагностики'
    : 'HASP: статус неизвестен';

  return (
    <div className="taskbar">
      <style>{`
        @keyframes hasp-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.82); }
        }
      `}</style>

      {/* Start button */}
      <button
        className={`start-button ${showStart ? 'start-active' : ''}`}
        onClick={e => { e.stopPropagation(); onStartClick(); }}
      >
        <img src={icLogo} width={18} height={18} style={{ borderRadius: 3, display: 'block', flexShrink: 0 }} alt="К" />
        <span className="start-label">Чайка</span>
      </button>

      <div className="taskbar-separator" />

      {/* Window buttons */}
      <div className="taskbar-windows">
        {windows.map(win => {
          const isActive = win.id === activeWindowId && !win.isMinimized;
          const isMin = win.isMinimized;
          const iconSrc = (win as any).customLogoUrl || getAppIcon(win.appId);
          return (
            <button
              key={win.id}
              className={`taskbar-btn${isActive ? ' taskbar-btn-active' : ''}${isMin ? ' taskbar-btn-minimized' : ''}`}
              onClick={() => onWindowClick(win.id)}
              title={win.title}
            >
              <img
                src={iconSrc}
                alt=""
                width={16}
                height={16}
                draggable={false}
                style={{ borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = icWebApp; }}
              />
              <span className="taskbar-btn-label">{win.title}</span>
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="system-tray">
        <div className="tray-icons">
          {onUploadFile && (
            <span className="tray-icon" title="Загрузить файл" onClick={onUploadFile}>
              <img src={icUpload} width={16} height={16} style={{ display: 'block' }} alt="" />
            </span>
          )}
          <span className="tray-icon" title="Сеть">
            <img src={icNetwork} width={16} height={16} style={{ display: 'block' }} alt="" />
          </span>
          <span className="tray-icon" title="Звук">
            <img src={icSound} width={16} height={16} style={{ display: 'block' }} alt="" />
          </span>
          {userName && (
            <span className="tray-icon" title={`Пользователь: ${userName}`} onClick={openUserCard} style={{ cursor: 'pointer', position: 'relative' }}>
              <img src={icUser} width={16} height={16} style={{ display: 'block' }} alt="" />
              {showUserCard && (
                <div ref={cardRef} onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 8, width: 240, background: 'rgba(10,20,50,0.98)', border: '1px solid rgba(100,160,220,0.4)', borderRadius: 16, padding: '16px', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', zIndex: 999999 }}>
                  {/* Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.email || '...'}</div>
                    </div>
                  </div>
                  {/* Info */}
                  {userProfile?.display_id && (
                    <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 11, color: '#a5b4fc', display: 'flex', justifyContent: 'space-between' }}>
                      <span>ID</span><span style={{ fontFamily: 'Consolas, monospace', fontWeight: 700 }}>{userProfile.display_id}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    <span>OAuth-приложения</span>
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>{oauthCount}</span>
                  </div>
                  {userProfile?.is_admin && <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#fbbf24', marginBottom: 10, textAlign: 'center' }}>🛡️ Администратор</div>}
                  {/* Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => { onOpenPassport?.(); setShowUserCard(false); }} style={{ width: '100%', padding: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🪪 Цифровой паспорт</button>
                    <button onClick={() => { setShowUserCard(false); window.dispatchEvent(new CustomEvent('chaika-open-app', { detail: { appId: 'appstore' } })); }} style={{ width: '100%', padding: '8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🏪 Магазин приложений</button>
                    <button onClick={() => { setShowUserCard(false); onLogout?.(); }} style={{ width: '100%', padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#fca5a5', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>⏻ Выйти из системы</button>
                  </div>
                </div>
              )}
            </span>
          )}

          {/* HASP status icon */}
          <span
            className="tray-icon"
            title={haspTitle}
            onClick={onHaspClick}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <span style={{
              fontSize: 13,
              display: 'block',
              lineHeight: 1,
              color: haspStatus === 'found' ? '#22c55e' : haspStatus === 'not_found' ? '#ef4444' : '#94a3b8',
              filter: haspStatus === 'found'
                ? 'drop-shadow(0 0 5px #22c55e)'
                : haspStatus === 'not_found'
                ? 'drop-shadow(0 0 6px #ef4444)'
                : 'none',
              animation: haspStatus === 'not_found' ? 'hasp-blink 1.2s ease-in-out infinite' : 'none',
            }}>
              {haspStatus === 'found' ? '🔐' : haspStatus === 'not_found' ? '🔓' : '🔏'}
            </span>
            {haspStatus === 'not_found' && (
              <span style={{
                position: 'absolute', top: 1, right: 1,
                width: 6, height: 6, borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 4px #ef4444',
                animation: 'hasp-blink 1.2s ease-in-out infinite',
              }} />
            )}
          </span>

          {onIndexWidgetClick && (
            <span className="tray-icon" title="Индексы Я-Россия" onClick={onIndexWidgetClick} style={{ cursor: 'pointer' }}>
              <img src={icIndex} width={16} height={16} style={{ display: 'block' }} alt="" />
            </span>
          )}
          <span
            className="tray-icon"
            title={`Уведомления${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            onClick={onNotificationClick}
            style={{
              animation: notifPulse ? 'notif-shake 0.3s ease' : 'none',
              cursor: 'pointer',
            }}
          >
            <img src={icBell} width={16} height={16} style={{ display: 'block' }} alt="" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: '#c42b1c', color: '#fff',
                fontSize: 9, fontWeight: 700,
                minWidth: 14, height: 14,
                borderRadius: 7, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '0 2px', lineHeight: 1,
                border: '1px solid rgba(0,0,0,0.3)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        </div>

        <div className="tray-divider" />

        <div className="clock">
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Выйти из системы"
            style={{
              height: '100%', padding: '0 12px',
              background: 'none', border: 'none',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              fontSize: 16, transition: 'background 0.12s, color 0.12s',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >⏻</button>
        )}
        <div className="show-desktop" title="Показать рабочий стол" />
      </div>
    </div>
  );
}
