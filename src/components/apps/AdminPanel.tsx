import React, { useState, useEffect } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { supabase } from '@/lib/supabase';
import { getAppIcon } from '@/lib/iconMap';

type Tab = 'users' | 'apps' | 'storage' | 'icons' | 'channels' | 'menu';

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' МБ';
  return (bytes / 1073741824).toFixed(2) + ' ГБ';
}

import { ALL_APP_IDS as ALL_APP_IDS_CONST } from '@/constants/apps';
const ALL_APP_IDS = ALL_APP_IDS_CONST.map(a => ({ id: a.id, label: a.label }));

// ============================================================
// CHANNELS TAB
// ============================================================
interface Channel {
  id: string; name: string; description?: string;
  logo_url?: string; rss_url?: string; is_active: boolean;
  created_at: string; rss_last_parsed?: string; rss_posts_added?: number;
}
interface ChannelPost {
  id: string; channel_id: string; title: string;
  content?: string; link?: string; published_at: string;
}

function ChannelsTab() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', rss_url: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', link: '' });
  const [addingPost, setAddingPost] = useState(false);
  const [rssLoading, setRssLoading] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadChannels = async () => {
    setLoading(true);
    const { data } = await supabase.from('channels').select('*').order('created_at', { ascending: false });
    setChannels((data as Channel[]) || []);
    setLoading(false);
  };

  const loadPosts = async (channelId: string) => {
    const { data } = await supabase.from('channel_posts').select('*').eq('channel_id', channelId).order('published_at', { ascending: false });
    setPosts((data as ChannelPost[]) || []);
  };

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => { if (selectedChannel) loadPosts(selectedChannel.id); }, [selectedChannel]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoFile(f); setLogoPreview(URL.createObjectURL(f));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    let logo_url = '';
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `channels/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('app-icons').upload(path, logoFile, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('app-icons').getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }
    }
    await supabase.from('channels').insert({ name: form.name.trim(), description: form.description.trim() || null, rss_url: form.rss_url.trim() || null, logo_url: logo_url || null });
    setForm({ name: '', description: '', rss_url: '' });
    setLogoFile(null); setLogoPreview('');
    setShowForm(false); setSaving(false);
    showMsg('Канал создан');
    loadChannels();
  };

  const handleUpdateAllRSS = async () => {
    setRssLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rss-parse', { body: {} });
      if (!error && data) showMsg(`RSS обновлён: +${data.added || 0} новых постов`);
      else showMsg('Ошибка RSS: ' + (error?.message || 'unknown'));
      loadChannels();
    } catch { showMsg('Ошибка соединения с RSS'); }
    setRssLoading(false);
  };

  const handleToggleActive = async (ch: Channel) => {
    await supabase.from('channels').update({ is_active: !ch.is_active }).eq('id', ch.id);
    setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, is_active: !c.is_active } : c));
    showMsg(ch.is_active ? 'Канал отключён' : 'Канал включён');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('channels').delete().eq('id', id);
    setChannels(prev => prev.filter(c => c.id !== id));
    if (selectedChannel?.id === id) setSelectedChannel(null);
    showMsg('Канал удалён');
  };

  const handleAddPost = async () => {
    if (!newPost.title.trim() || !selectedChannel) return;
    setAddingPost(true);
    await supabase.from('channel_posts').insert({ channel_id: selectedChannel.id, title: newPost.title.trim(), content: newPost.content.trim() || null, link: newPost.link.trim() || null });
    setNewPost({ title: '', content: '', link: '' });
    loadPosts(selectedChannel.id);
    setAddingPost(false);
    showMsg('Пост добавлен');
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('channel_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div style={{ position: 'relative' }}>
      {toast && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>✓ {toast}</div>}
      <div style={{ display: 'flex', gap: 20, height: '100%' }}>
        {/* Channel list */}
        <div style={{ width: 330, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, flex: 1 }}>📢 Каналы ({channels.length})</h2>
            <button onClick={handleUpdateAllRSS} disabled={rssLoading}
              style={{ padding: '6px 12px', background: rssLoading ? '#94a3b8' : '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
              {rssLoading ? '⟳' : '📡 Обновить RSS'}
            </button>
            <button onClick={() => setShowForm(s => !s)} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>+ Создать</button>
          </div>

          {showForm && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Новый канал</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название *" style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание" style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                <input value={form.rss_url} onChange={e => setForm(p => ({ ...p, rss_url: e.target.value }))} placeholder="RSS URL (необязательно)" style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'inline-block', padding: '6px 12px', background: '#f1f5f9', border: '1px dashed #d1d5db', borderRadius: 6, fontSize: 12, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                    📁 Логотип
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFileChange} />
                  </label>
                  {logoPreview && <img src={logoPreview} alt="" width={36} height={36} style={{ borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} />}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCreate} disabled={saving || !form.name.trim()} style={{ flex: 1, padding: '8px', background: saving || !form.name.trim() ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>{saving ? '...' : '✓ Создать'}</button>
                  <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Отмена</button>
                </div>
              </div>
            </div>
          )}

          {loading ? <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>Загрузка...</div>
            : channels.length === 0 ? <div style={{ textAlign: 'center', padding: 30, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', color: '#888' }}>Нет каналов</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {channels.map(ch => (
                    <div key={ch.id} onClick={() => setSelectedChannel(ch)}
                      style={{ background: selectedChannel?.id === ch.id ? '#eff6ff' : '#fff', border: `1px solid ${selectedChannel?.id === ch.id ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', opacity: ch.is_active ? 1 : 0.6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0369a1,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {ch.logo_url ? <img src={ch.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, color: '#fff' }}>📢</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                        {ch.rss_url && <div style={{ fontSize: 10, color: '#0ea5e9' }}>📡 RSS</div>}
                        {ch.rss_last_parsed && <div style={{ fontSize: 9, color: '#94a3b8' }}>Посты: {ch.rss_posts_added || 0} · {new Date(ch.rss_last_parsed).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleToggleActive(ch)} style={{ padding: '3px 8px', fontSize: 10, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: ch.is_active ? '#dcfce7' : '#f1f5f9', color: ch.is_active ? '#166534' : '#64748b', fontWeight: 600 }}>
                          {ch.is_active ? 'ВКЛ' : 'ВЫКЛ'}
                        </button>
                        <button onClick={() => handleDelete(ch.id)} style={{ padding: '3px 8px', fontSize: 10, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>

        {/* Posts panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedChannel ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>📰</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите канал</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Посты «{selectedChannel.name}»</h3>
                <button onClick={() => loadPosts(selectedChannel.id)} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#475569', fontWeight: 600 }}>🔄 Обновить</button>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>➕ Добавить пост</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} placeholder="Заголовок *" style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                  <textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} placeholder="Содержание" rows={3} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'Segoe UI, sans-serif' }} />
                  <input value={newPost.link} onChange={e => setNewPost(p => ({ ...p, link: e.target.value }))} placeholder="Ссылка" style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                  <button onClick={handleAddPost} disabled={addingPost || !newPost.title.trim()} style={{ alignSelf: 'flex-start', padding: '8px 20px', background: !newPost.title.trim() ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                    {addingPost ? '...' : '➕ Опубликовать'}
                  </button>
                </div>
              </div>
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', color: '#888' }}>Нет постов</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {posts.map(post => (
                    <div key={post.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{post.title}</div>
                          {post.content && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</div>}
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{new Date(post.published_at).toLocaleString('ru-RU')}</div>
                        </div>
                        <button onClick={() => handleDeletePost(post.id)} style={{ padding: '5px 10px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MENU TAB — Start Menu sections management
// ============================================================
interface MenuSection {
  id: string; name: string; sort_order: number;
}
interface MenuItem {
  id: string; section_id: string; app_id?: string;
  title?: string; sort_order: number;
}

function MenuTab() {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [selectedSection, setSelectedSection] = useState<MenuSection | null>(null);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadSections = async () => {
    setLoading(true);
    const { data } = await supabase.from('start_menu_sections').select('*').order('sort_order');
    setSections((data as MenuSection[]) || []);
    setLoading(false);
  };

  const loadItems = async () => {
    const { data } = await supabase.from('start_menu_items').select('*').order('sort_order');
    setItems((data as MenuItem[]) || []);
  };

  useEffect(() => { loadSections(); loadItems(); }, []);

  const createSection = async () => {
    if (!newSectionName.trim()) return;
    setAddingSection(true);
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0);
    await supabase.from('start_menu_sections').insert({ name: newSectionName.trim(), sort_order: maxOrder + 1 });
    setNewSectionName('');
    setAddingSection(false);
    loadSections();
    showMsg('Раздел создан');
  };

  const deleteSection = async (id: string) => {
    await supabase.from('start_menu_sections').delete().eq('id', id);
    if (selectedSection?.id === id) setSelectedSection(null);
    setSections(prev => prev.filter(s => s.id !== id));
    setItems(prev => prev.filter(i => i.section_id !== id));
    showMsg('Раздел удалён');
  };

  const addAppToSection = async () => {
    if (!selectedSection || !selectedAppId) return;
    const appDef = ALL_APP_IDS.find(a => a.id === selectedAppId);
    const maxOrder = items.filter(i => i.section_id === selectedSection.id).reduce((m, i) => Math.max(m, i.sort_order), 0);
    const { error } = await supabase.from('start_menu_items').insert({
      section_id: selectedSection.id,
      app_id: selectedAppId,
      title: appDef?.label || selectedAppId,
      sort_order: maxOrder + 1,
    });
    if (!error) {
      loadItems();
      setSelectedAppId('');
      showMsg(`${appDef?.label} добавлен в раздел`);
    }
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('start_menu_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const sectionItems = selectedSection ? items.filter(i => i.section_id === selectedSection.id) : [];

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 999 }}>✓ {toast}</div>}

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🗂️ Управление меню</h2>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Создавайте разделы Чайка ОС v29 и назначайте в них приложения. Разделы отображаются в меню при открытии «Все программы».</p>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sections list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Новый раздел</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="Название раздела"
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') createSection(); }} />
              <button onClick={createSection} disabled={addingSection || !newSectionName.trim()}
                style={{ padding: '8px 14px', background: !newSectionName.trim() ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                {addingSection ? '...' : '+'}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Разделы ({sections.length})</div>
          {loading ? <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
            : sections.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: '#888', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>Нет разделов</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sections.map(sec => {
                    const secItems = items.filter(i => i.section_id === sec.id);
                    const isSelected = selectedSection?.id === sec.id;
                    return (
                      <div key={sec.id} onClick={() => setSelectedSection(sec)}
                        style={{ background: isSelected ? '#eff6ff' : '#fff', border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{sec.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{secItems.length} приложений</div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteSection(sec.id); }}
                          style={{ padding: '4px 8px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>🗑</button>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>

        {/* Section apps */}
        <div style={{ flex: 1 }}>
          {!selectedSection ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🗂️</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите раздел</div>
            </div>
          ) : (
            <>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>➕ Добавить приложение в «{selectedSection.name}»</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b' }}>
                    <option value="">— Выберите приложение —</option>
                    {ALL_APP_IDS.map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                  <button onClick={addAppToSection} disabled={!selectedAppId}
                    style={{ padding: '8px 18px', background: !selectedAppId ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                    + Добавить
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Приложения в разделе «{selectedSection.name}» ({sectionItems.length})</div>
              {sectionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', color: '#888', fontSize: 13 }}>
                  Раздел пуст. Добавьте приложения выше.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {sectionItems.map(item => {
                    const appDef = ALL_APP_IDS.find(a => a.id === item.app_id);
                    const iconSrc = item.app_id ? getAppIcon(item.app_id) : '';
                    return (
                      <div key={item.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        {iconSrc && <img src={iconSrc} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || appDef?.label || item.app_id}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{item.app_id}</div>
                        </div>
                        <button onClick={() => removeItem(item.id)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ADMIN PANEL
// ============================================================
export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [newApp, setNewApp] = useState({ title: '', url: '', logo_emoji: '🌐', logo_url: '' });
  const [addingApp, setAddingApp] = useState(false);
  const [editQuota, setEditQuota] = useState<{ userId: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>({});
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [iconUrlInput, setIconUrlInput] = useState('');
  const [iconUploading, setIconUploading] = useState(false);

  const { users, apps, loading, loadUsers, loadApps, deleteUser, toggleAdmin, setStorageQuota, addCustomApp, deleteCustomApp, toggleAppActive } = useAdminData();

  useEffect(() => { loadUsers(); loadApps(); loadIconOverrides(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadIconOverrides = async () => {
    const { data } = await supabase.from('app_icon_overrides').select('*');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.app_id] = row.icon_url; });
      setIconOverrides(map);
    }
  };

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setConfirmDelete(null);
    showToast('Пользователь удалён');
  };

  const handleSetQuota = async () => {
    if (!editQuota) return;
    const mb = parseFloat(editQuota.value);
    if (isNaN(mb) || mb < 1) return;
    await setStorageQuota(editQuota.userId, mb);
    setEditQuota(null);
    showToast('Квота обновлена');
  };

  const handleAddApp = async () => {
    if (!newApp.title.trim() || !newApp.url.trim()) return;
    let url = newApp.url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setAddingApp(true);
    await addCustomApp({ ...newApp, url });
    setNewApp({ title: '', url: '', logo_emoji: '🌐', logo_url: '' });
    setAddingApp(false);
    showToast('Приложение добавлено');
  };

  const handleSaveIconUrl = async (appId: string) => {
    if (!iconUrlInput.trim()) return;
    await supabase.from('app_icon_overrides').upsert({ app_id: appId, icon_url: iconUrlInput.trim(), updated_at: new Date().toISOString() });
    setIconOverrides(prev => ({ ...prev, [appId]: iconUrlInput.trim() }));
    setEditingIconId(null); setIconUrlInput('');
    showToast('Иконка обновлена');
    window.dispatchEvent(new CustomEvent('icon-overrides-updated'));
  };

  const handleUploadIcon = async (appId: string, file: File) => {
    setIconUploading(true);
    const ext = file.name.split('.').pop();
    const path = `icons/${appId}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('app-icons').upload(path, file, { upsert: true });
    if (error) { showToast('Ошибка загрузки'); setIconUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('app-icons').getPublicUrl(path);
    await supabase.from('app_icon_overrides').upsert({ app_id: appId, icon_url: publicUrl, updated_at: new Date().toISOString() });
    setIconOverrides(prev => ({ ...prev, [appId]: publicUrl }));
    setIconUploading(false);
    showToast('Иконка загружена');
    window.dispatchEvent(new CustomEvent('icon-overrides-updated'));
  };

  const handleResetIcon = async (appId: string) => {
    await supabase.from('app_icon_overrides').delete().eq('app_id', appId);
    setIconOverrides(prev => { const n = { ...prev }; delete n[appId]; return n; });
    showToast('Иконка сброшена');
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
    background: tab === t ? 'rgba(59,130,246,0.12)' : 'none',
    color: tab === t ? '#3b82f6' : '#555', transition: 'all 0.15s', whiteSpace: 'nowrap',
  });

  const emojis = ['🌐', '📧', '🔵', '🟠', '🔴', '📺', '🏛️', '🎮', '📱', '🛒', '💼', '📰', '🎵', '🎬', '🗺️', '☁️'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif', background: '#f5f7fa', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 99, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Панель администратора</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>ОС Чайка 29 — Управление системой</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{users.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Пользователей</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{apps.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Приложений</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', overflowX: 'auto', flexShrink: 0 }}>
        <button style={tabStyle('users')} onClick={() => setTab('users')}>👥 Пользователи</button>
        <button style={tabStyle('storage')} onClick={() => setTab('storage')}>💾 Хранилище</button>
        <button style={tabStyle('apps')} onClick={() => setTab('apps')}>🌐 Приложения</button>
        <button style={tabStyle('icons')} onClick={() => setTab('icons')}>🖼️ Иконки</button>
        <button style={tabStyle('channels')} onClick={() => setTab('channels')}>📢 Каналы</button>
        <button style={tabStyle('menu')} onClick={() => setTab('menu')}>🗂️ Меню</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Управление пользователями</h2>
              <button onClick={loadUsers} style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🔄 Обновить</button>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка...</div> : users.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Нет пользователей</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(u => (
                  <div key={u.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.is_admin ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {(u.username || u.email)[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{u.username}</span>
                        {u.is_admin && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>ADMIN</span>}
                        {(u as any).display_id && <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{(u as any).display_id}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleAdmin(u.id, !u.is_admin)} style={{ padding: '5px 10px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: u.is_admin ? '#fef3c7' : '#f1f5f9', color: u.is_admin ? '#92400e' : '#475569', fontWeight: 600 }}>
                        {u.is_admin ? '👑 Снять' : '👑 Назначить'}
                      </button>
                      {confirmDelete === u.id ? (
                        <>
                          <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '5px 10px', fontSize: 11, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Удалить!</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ padding: '5px 10px', fontSize: 11, background: '#e5e7eb', color: '#555', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Отмена</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(u.id)} style={{ padding: '5px 10px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>🗑</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STORAGE */}
        {tab === 'storage' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Управление хранилищем</h2>
              <button onClick={loadUsers} style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🔄 Обновить</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map(u => {
                const usedPct = u.storage_quota ? Math.min(100, ((u.storage_used || 0) / u.storage_quota) * 100) : 0;
                const barColor = usedPct > 85 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : '#22c55e';
                return (
                  <div key={u.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                        {(u.username || u.email)[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{u.username}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{formatBytes(u.storage_used || 0)}</div>
                        <div>из {formatBytes(u.storage_quota || 0)}</div>
                      </div>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ width: `${usedPct}%`, height: '100%', background: barColor, borderRadius: 6, transition: 'width 0.3s' }} />
                    </div>
                    {editQuota?.userId === u.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" value={editQuota.value} onChange={e => setEditQuota({ ...editQuota, value: e.target.value })} style={{ flex: 1, padding: '5px 10px', border: '1px solid #3b82f6', borderRadius: 6, fontSize: 13, outline: 'none' }} placeholder="МБ" min="1" />
                        <span style={{ fontSize: 12, color: '#64748b' }}>МБ</span>
                        <button onClick={handleSetQuota} style={{ padding: '5px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✓</button>
                        <button onClick={() => setEditQuota(null)} style={{ padding: '5px 10px', background: '#e5e7eb', color: '#555', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditQuota({ userId: u.id, value: String(Math.round((u.storage_quota || 104857600) / 1048576)) })} style={{ padding: '5px 14px', background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#475569', fontWeight: 600 }}>✏️ Изменить квоту</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APPS */}
        {tab === 'apps' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Веб-приложения</h2>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>➕ Добавить приложение</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>НАЗВАНИЕ</label>
                  <input value={newApp.title} onChange={e => setNewApp(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} placeholder="Яндекс.Карты" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>АДРЕС (URL)</label>
                  <input value={newApp.url} onChange={e => setNewApp(p => ({ ...p, url: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} placeholder="https://maps.yandex.ru" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>ИКОНКА-ЭМОДЗИ</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {emojis.map(em => (
                    <button key={em} onClick={() => setNewApp(p => ({ ...p, logo_emoji: em }))} style={{ width: 36, height: 36, fontSize: 20, border: newApp.logo_emoji === em ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', background: newApp.logo_emoji === em ? '#eff6ff' : '#f9fafb' }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f1f5f9', border: '1px dashed #d1d5db', borderRadius: 6, fontSize: 12, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                  📁 Загрузить иконку
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const ext = f.name.split('.').pop();
                    const path = `custom-apps/${Date.now()}.${ext}`;
                    const { data, error } = await supabase.storage.from('app-icons').upload(path, f, { upsert: true });
                    if (!error && data) {
                      const { data: { publicUrl } } = supabase.storage.from('app-icons').getPublicUrl(path);
                      setNewApp(p => ({ ...p, logo_url: publicUrl }));
                    }
                  }} />
                </label>
                {newApp.logo_url && <img src={newApp.logo_url} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover', border: '1px solid #e5e7eb' }} />}
                <input value={newApp.logo_url} onChange={e => setNewApp(p => ({ ...p, logo_url: e.target.value }))} style={{ flex: 1, padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} placeholder="URL логотипа (необязательно)" />
              </div>
              <button onClick={handleAddApp} disabled={addingApp || !newApp.title.trim() || !newApp.url.trim()}
                style={{ padding: '9px 24px', background: (addingApp || !newApp.title.trim() || !newApp.url.trim()) ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                {addingApp ? '∷ Добавляю...' : '+ Добавить приложение'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apps.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#888', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🌐</div>Добавьте первое веб-приложение
                </div>
              )}
              {apps.map(app => (
                <div key={app.id} style={{ background: '#fff', border: `1px solid ${app.is_active ? '#e5e7eb' : '#fca5a5'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', opacity: app.is_active ? 1 : 0.65 }}>
                  <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {app.logo_url ? <img src={app.logo_url} style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : (app.logo_emoji || '🌐')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{app.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.url}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => toggleAppActive(app.id, !app.is_active)} style={{ padding: '5px 10px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: app.is_active ? '#dcfce7' : '#f1f5f9', color: app.is_active ? '#166534' : '#64748b', fontWeight: 600 }}>
                      {app.is_active ? '✓ Вкл' : '✗ Выкл'}
                    </button>
                    <button onClick={() => deleteCustomApp(app.id)} style={{ padding: '5px 10px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHANNELS */}
        {tab === 'channels' && <ChannelsTab />}

        {/* MENU */}
        {tab === 'menu' && <MenuTab />}

        {/* ICONS */}
        {tab === 'icons' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Управление иконками приложений</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Замените стандартную иконку — загрузите файл или укажите URL.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {ALL_APP_IDS.map(app => {
                const currentIcon = iconOverrides[app.id] || getAppIcon(app.id);
                const isCustom = !!iconOverrides[app.id];
                const isEditing = editingIconId === app.id;
                return (
                  <div key={app.id} style={{ background: '#fff', border: `1px solid ${isCustom ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isEditing ? 12 : 0 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: isCustom ? '2px solid #3b82f6' : '2px solid #e5e7eb' }}>
                        <img src={currentIcon} alt={app.label} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 8 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{app.label}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{app.id}</div>
                        {isCustom && <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, marginTop: 2 }}>● Кастомная</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditingIconId(isEditing ? null : app.id); setIconUrlInput(iconOverrides[app.id] || ''); }}
                          style={{ padding: '4px 8px', fontSize: 11, background: isEditing ? '#e5e7eb' : '#eff6ff', color: isEditing ? '#555' : '#1d4ed8', border: `1px solid ${isEditing ? '#d1d5db' : '#bfdbfe'}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          {isEditing ? 'Отмена' : '✏️'}
                        </button>
                        {isCustom && <button onClick={() => handleResetIcon(app.id)} style={{ padding: '4px 8px', fontSize: 11, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>↩</button>}
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>URL изображения</label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          <input value={iconUrlInput} onChange={e => setIconUrlInput(e.target.value)} placeholder="https://example.com/icon.png"
                            style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
                          <button onClick={() => handleSaveIconUrl(app.id)} disabled={!iconUrlInput.trim()}
                            style={{ padding: '6px 12px', background: iconUrlInput.trim() ? '#3b82f6' : '#94a3b8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>OK</button>
                        </div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Или загрузить файл</label>
                        <label style={{ display: 'inline-block', padding: '6px 14px', background: iconUploading ? '#94a3b8' : '#f1f5f9', border: '1px dashed #d1d5db', borderRadius: 6, fontSize: 12, color: '#475569', cursor: iconUploading ? 'wait' : 'pointer', fontWeight: 600 }}>
                          {iconUploading ? '⟳ Загрузка...' : '📁 Выбрать PNG/JPG'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={iconUploading}
                            onChange={async e => { const f = e.target.files?.[0]; if (f) { await handleUploadIcon(app.id, f); setEditingIconId(null); } }} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
