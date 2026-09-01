/**
 * Чайка ОС — Магазин приложений
 * Управление Start Menu: добавить/убрать приложения
 * Кастомные веб-приложения через Supabase custom_apps
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { APPS, ALL_APP_IDS } from '@/constants/apps';

const PINNED_KEY = 'chaika_pinned_apps';
const CATEGORIES = ['Все', 'Система', 'Офис', 'Интернет', 'Медиа', 'Разработка', 'Наука', 'Игры', 'Бизнес', 'Утилиты'];

function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
}
function setPinned(ids: string[]) { localStorage.setItem(PINNED_KEY, JSON.stringify(ids)); }

interface CustomApp {
  id: string;
  title: string;
  url: string;
  logo_emoji: string;
  logo_url?: string;
  is_active: boolean;
}

export default function AppStoreBrowser() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');
  const [pinned, setPinnedState] = useState<string[]>(getPinned);
  const [customApps, setCustomApps] = useState<CustomApp[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('https://');
  const [newEmoji, setNewEmoji] = useState('🌐');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'all' | 'pinned' | 'custom'>('all');

  useEffect(() => {
    loadCustomApps();
  }, []);

  const loadCustomApps = async () => {
    const { data } = await supabase.from('custom_apps').select('*').order('created_at', { ascending: false });
    if (data) setCustomApps(data as CustomApp[]);
  };

  const togglePin = (id: string) => {
    const current = getPinned();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    setPinned(next);
    setPinnedState(next);
    window.dispatchEvent(new CustomEvent('chaika-pinned-apps-changed', { detail: { pinned: next } }));
  };

  const handleAddCustomApp = async () => {
    if (!newTitle || !newUrl) return;
    setSaving(true);
    await supabase.from('custom_apps').insert({
      title: newTitle,
      url: newUrl,
      logo_emoji: newEmoji,
      created_by: user?.id,
      is_active: true,
    });
    await loadCustomApps();
    setNewTitle(''); setNewUrl('https://'); setNewEmoji('🌐');
    setShowAddCustom(false);
    setSaving(false);
  };

  const handleDeleteCustomApp = async (id: string) => {
    await supabase.from('custom_apps').delete().eq('id', id);
    setCustomApps(prev => prev.filter(a => a.id !== id));
  };

  const openApp = (appId: string, url?: string, title?: string, emoji?: string) => {
    if (url) {
      window.dispatchEvent(new CustomEvent('chaika-open-app', {
        detail: { appId: `custom_${appId}`, customUrl: url, title, emoji }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('chaika-open-app', { detail: { appId } }));
    }
  };

  const filteredApps = ALL_APP_IDS.filter(app => {
    const appDef = APPS.find(a => a.id === app.id);
    if (!appDef) return false;
    const matchSearch = !search || app.label.toLowerCase().includes(search.toLowerCase()) || (appDef.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Все' || app.section === category;
    return matchSearch && matchCat;
  });

  const pinnedApps = ALL_APP_IDS.filter(a => pinned.includes(a.id));

  const SECTION_ICONS: Record<string, string> = {
    'Система': '⚙️', 'Офис': '📄', 'Интернет': '🌐', 'Медиа': '🎬',
    'Разработка': '💻', 'Наука': '🔬', 'Игры': '🎮', 'Бизнес': '📊',
    'Связь': '💬', 'Утилиты': '🔧',
  };

  const card = (id: string, label: string, section: string, description: string, onOpen: () => void) => {
    const isPinned = pinned.includes(id);
    return (
      <div key={id} style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a5f'}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {SECTION_ICONS[section] || '📱'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>
          <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid #1e3a5f', borderRadius: 5, color: '#64748b' }}>{section}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={onOpen} style={{ padding: '5px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7, color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>▶ Открыть</button>
          <button onClick={() => togglePin(id)} style={{ padding: '5px 12px', background: isPinned ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isPinned ? 'rgba(34,197,94,0.4)' : '#1e3a5f'}`, borderRadius: 7, color: isPinned ? '#86efac' : '#475569', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {isPinned ? '✓ В меню' : '+ В меню'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '16px 20px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 2 }}>🏪 Магазин приложений</div>
        <div style={{ fontSize: 12, color: '#475569' }}>Управляйте приложениями в меню Пуск · {ALL_APP_IDS.length} приложений</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#0f1929', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        {[
          { id: 'all', label: `Все (${ALL_APP_IDS.length})` },
          { id: 'pinned', label: `В меню (${pinned.length})` },
          { id: 'custom', label: `Мои сайты (${customApps.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{ flex: 1, padding: '11px 16px', background: tab === t.id ? 'rgba(124,58,237,0.15)' : 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #7c3aed' : '2px solid transparent', color: tab === t.id ? '#c4b5fd' : '#64748b', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'all' && (
          <>
            {/* Search and filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Поиск приложений..." style={{ flex: 1, padding: '9px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '5px 12px', background: category === cat ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${category === cat ? '#7c3aed60' : '#1e3a5f'}`, borderRadius: 8, color: category === cat ? '#c4b5fd' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: category === cat ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredApps.map(app => {
                const appDef = APPS.find(a => a.id === app.id);
                return card(app.id, app.label, app.section, appDef?.description || '', () => openApp(app.id));
              })}
              {filteredApps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                  <div>Приложения не найдены</div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'pinned' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pinned.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📌</div>
                <div style={{ marginBottom: 8 }}>Нет закреплённых приложений</div>
                <div style={{ fontSize: 12, color: '#1e3a5f' }}>Перейдите во вкладку «Все» и нажмите «+ В меню»</div>
              </div>
            ) : pinnedApps.map(app => {
              const appDef = APPS.find(a => a.id === app.id);
              return card(app.id, app.label, app.section, appDef?.description || '', () => openApp(app.id));
            })}
          </div>
        )}

        {tab === 'custom' && (
          <div>
            {/* Add button */}
            <div style={{ marginBottom: 16 }}>
              {!showAddCustom ? (
                <button onClick={() => setShowAddCustom(true)} style={{ width: '100%', padding: '12px', background: 'rgba(124,58,237,0.1)', border: '1px dashed rgba(124,58,237,0.4)', borderRadius: 12, color: '#c4b5fd', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Добавить свой сайт
                </button>
              ) : (
                <div style={{ background: '#0f1929', border: '1px solid #7c3aed60', borderRadius: 14, padding: '16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 12 }}>Новый сайт</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>EMOJI</label>
                      <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} style={{ width: '100%', padding: '9px', background: '#0a1628', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 22, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>НАЗВАНИЕ</label>
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название сайта" style={{ width: '100%', padding: '9px 12px', background: '#0a1628', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>URL</label>
                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://" style={{ width: '100%', padding: '9px 12px', background: '#0a1628', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Consolas, monospace' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddCustomApp} disabled={saving || !newTitle || !newUrl} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? '⟳' : '+ Добавить'}
                    </button>
                    <button onClick={() => setShowAddCustom(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #1e3a5f', borderRadius: 8, color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom apps list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customApps.map(app => (
                <div key={app.id} style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: app.logo_url ? 'none' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {app.logo_url ? <img src={app.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : app.logo_emoji || '🌐'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{app.title}</div>
                    <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.url}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openApp(app.id, app.url, app.title, app.logo_emoji)} style={{ padding: '6px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7, color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>▶</button>
                    {isAdmin && <button onClick={() => handleDeleteCustomApp(app.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#fca5a5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>}
                  </div>
                </div>
              ))}
              {customApps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#334155' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🌐</div>
                  <div>Добавьте свои любимые сайты</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
