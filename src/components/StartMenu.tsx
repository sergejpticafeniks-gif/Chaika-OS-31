import React, { useState, useRef, useEffect } from 'react';
import { ALL_APP_IDS } from '@/constants/apps';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomApps } from '@/hooks/useCustomApps';
import { getAppIcon } from '@/lib/iconMap';
import { supabase } from '@/lib/supabase';
import icWebApp from '@/assets/icons/webapp.png';
import icLogo from '@/assets/icons/chaika-logo.png';

interface StartMenuSection {
  id: string;
  name: string;
  sort_order: number;
}

interface StartMenuProps {
  onOpenApp: (appId: string) => void;
  onOpenCustomApp: (id: string, title: string, url: string, icon: string, logoUrl?: string) => void;
  onClose: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

function AppIcon({ appId, logoUrl, size = 18 }: { appId: string; logoUrl?: string; size?: number }) {
  const src = logoUrl || getAppIcon(appId);
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      onError={e => { (e.currentTarget as HTMLImageElement).src = icWebApp; }}
    />
  );
}

export default function StartMenu({ onOpenApp, onOpenCustomApp, onClose, onLogout, isAdmin }: StartMenuProps) {
  const { user } = useAuth();
  const { customApps } = useCustomApps();
  const [showAllApps, setShowAllApps] = useState(false);
  const [search, setSearch] = useState('');
  const [dbSections, setDbSections] = useState<StartMenuSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('start_menu_sections').select('*').order('sort_order')
      .then(({ data }) => { if (data?.length) setDbSections(data as StartMenuSection[]); });
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => e.stopPropagation();

  // Combine ALL built-in apps + custom apps — no separation
  const allApps = [
    ...ALL_APP_IDS.map(a => ({ id: a.id, title: a.label, section: a.section, logoUrl: undefined as string | undefined })),
    ...customApps.map(a => ({ id: `custom_${a.id}`, title: a.title, section: 'Веб-приложения', logoUrl: a.logo_url || undefined })),
  ];

  // Search filter
  const filteredApps = search.trim()
    ? allApps.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  // Group by section
  const sections: Record<string, typeof allApps> = {};
  allApps.forEach(app => {
    const s = app.section || 'Программы';
    if (!sections[s]) sections[s] = [];
    sections[s].push(app);
  });

  const sectionOrder = dbSections.length > 0
    ? dbSections.map(s => s.name).filter(n => sections[n])
    : Object.keys(sections);

  // Add any sections not in DB order
  Object.keys(sections).forEach(s => {
    if (!sectionOrder.includes(s)) sectionOrder.push(s);
  });

  const handleAppClick = (appId: string) => {
    if (appId.startsWith('custom_')) {
      const realId = appId.replace('custom_', '');
      const ca = customApps.find(a => a.id === realId);
      if (ca) { onOpenCustomApp(ca.id, ca.title, ca.url, ca.logo_emoji || '🌐', ca.logo_url || undefined); onClose(); }
    } else {
      onOpenApp(appId); onClose();
    }
  };

  // Quick access — top apps
  const quickApps = allApps.slice(0, 8);

  const RIGHT_LINKS = [
    { appId: 'word',        label: 'Word' },
    { appId: 'excel',       label: 'Excel' },
    { appId: 'rigonda',     label: 'Ригонда' },
    { appId: 'russia',      label: 'Я-Россия' },
    { appId: 'crm',         label: 'CRM' },
    { appId: 'filemanager', label: 'Проводник' },
    { appId: 'browser',     label: 'Браузер' },
    { appId: 'vk',          label: 'ВКонтакте' },
    { appId: 'settings',    label: 'Параметры' },
  ];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={onClose} />
      <div ref={menuRef} className="start-menu" onClick={handleMenuClick}>

        {/* User header */}
        <div className="start-header">
          <div className="start-avatar">
            <span style={{ fontSize: 24 }}>{user?.username?.[0]?.toUpperCase() || '👤'}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="start-username">
              {(user as any)?.firstName && (user as any)?.lastName
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : user?.username || 'Пользователь'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, letterSpacing: 0.5 }}>
              {isAdmin ? '⭐ АДМИНИСТРАТОР' : ((user as any)?.displayId || 'ОС ЧАЙКА 29')}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.4, color: '#fff', pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск программ и параметров..."
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, color: '#fff', fontSize: 12,
                outline: 'none', fontFamily: 'Segoe UI, sans-serif',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,120,212,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
        </div>

        <div className="start-body">
          {/* Left: Apps list */}
          <div className="start-left">

            {/* Search results */}
            {search.trim() && filteredApps && (
              <div>
                {filteredApps.length === 0
                  ? <div style={{ padding: '20px 16px', color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center' }}>Не найдено</div>
                  : filteredApps.map(app => (
                    <button key={app.id} className="start-app-btn" onClick={() => handleAppClick(app.id)}>
                      <AppIcon appId={app.id} logoUrl={app.logoUrl} size={18} />
                      <span className="start-app-title">{app.title}</span>
                    </button>
                  ))
                }
              </div>
            )}

            {/* Normal: quick access */}
            {!search.trim() && !showAllApps && (
              <>
                <div className="start-section-label">Быстрый доступ</div>
                {quickApps.map(app => (
                  <button key={app.id} className="start-app-btn" onClick={() => handleAppClick(app.id)}>
                    <AppIcon appId={app.id} logoUrl={app.logoUrl} size={18} />
                    <span className="start-app-title">{app.title}</span>
                  </button>
                ))}
              </>
            )}

            {/* All apps — grouped by section (unified) */}
            {!search.trim() && showAllApps && (
              <div>
                {sectionOrder.map(sectionName => {
                  const secApps = sections[sectionName] || [];
                  if (!secApps.length) return null;
                  const isExpanded = expandedSection === null || expandedSection === sectionName;
                  return (
                    <div key={sectionName}>
                      <button
                        onClick={() => setExpandedSection(isExpanded && expandedSection === sectionName ? null : sectionName)}
                        style={{
                          width: '100%', padding: '6px 16px',
                          background: 'rgba(255,255,255,0.04)',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.6)', fontSize: 10,
                          fontWeight: 700, cursor: 'pointer',
                          textAlign: 'left', display: 'flex',
                          alignItems: 'center', justifyContent: 'space-between',
                          textTransform: 'uppercase', letterSpacing: 1,
                          fontFamily: 'Segoe UI, sans-serif',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      >
                        <span>{sectionName}</span>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>{isExpanded ? '▾' : '▸'} {secApps.length}</span>
                      </button>
                      {isExpanded && secApps.map(app => (
                        <button key={app.id} className="start-app-btn" onClick={() => handleAppClick(app.id)}>
                          <AppIcon appId={app.id} logoUrl={app.logoUrl} size={18} />
                          <span className="start-app-title">{app.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="start-separator-h" />
            <button className="start-all-btn" onClick={() => setShowAllApps(s => !s)}>
              <span>{showAllApps ? '▾ Свернуть' : '▸ Все программы'}</span>
              {!showAllApps && <span style={{ fontSize: 11, opacity: 0.5 }}>›</span>}
            </button>
          </div>

          <div className="start-divider" />

          {/* Right: Quick links */}
          <div className="start-right">
            <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Быстрый запуск</div>
            {RIGHT_LINKS.map(item => (
              <button key={item.appId} className="start-right-btn" onClick={() => { onOpenApp(item.appId); onClose(); }}>
                <AppIcon appId={item.appId} size={16} />
                <span>{item.label}</span>
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => { onOpenApp('admin'); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'rgba(196,43,28,0.12)', border: 'none', color: '#fca5a5', fontSize: 12, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, fontFamily: 'Segoe UI, sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,43,28,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(196,43,28,0.12)'}
              >
                <AppIcon appId="admin" size={16} />
                <span>Администрирование</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="start-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={icLogo} width={20} height={20} style={{ borderRadius: 3 }} alt="К" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>Чайка ОС 29</span>
          </div>
          <div className="start-footer-right">
            <button className="start-footer-btn" onClick={onClose}>🔒 Блокировка</button>
            <button className="start-footer-btn" onClick={async () => {
              const { supabase: s } = await import('@/lib/supabase');
              await s.auth.signOut(); onLogout(); onClose();
            }}>⏻ Выход</button>
          </div>
        </div>
      </div>
    </>
  );
}
