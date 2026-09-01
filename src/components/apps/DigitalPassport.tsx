/**
 * Чайка ОС — Цифровой паспорт
 * Профиль пользователя + OAuth-клиенты + связанные аккаунты
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const SSO_BASE = 'https://edmxgfiyabbptsjeedmx.backend.onspace.ai/functions/v1/chaika-sso';

interface Passport {
  first_name?: string; last_name?: string; patronymic?: string;
  birth_date?: string; gender?: string; city?: string;
  country?: string; phone?: string; bio?: string; website?: string;
  linked_accounts?: any[];
}

interface OAuthClient {
  id: string; client_id: string; name: string; description?: string;
  redirect_uris: string[]; scopes: string[]; is_active: boolean; created_at: string;
}

type Tab = 'profile' | 'clients' | 'tokens' | 'security';

export default function DigitalPassport() {
  const { user } = useAuth();
  const [tab, setTab]           = useState<Tab>('profile');
  const [passport, setPassport] = useState<Passport>({});
  const [clients, setClients]   = useState<OAuthClient[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);
  const [newClient, setNewClient] = useState({ name: '', description: '', redirect_uris: '', logo_url: '' });
  const [createdClient, setCreatedClient] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('digital_passports').select().eq('user_id', user.id).single(),
    ]).then(([{ data: pd }]) => {
      if (pd) setPassport(pd as Passport);
      setLoading(false);
    });
    loadClients();
  }, [user]);

  const loadClients = async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${SSO_BASE}/clients`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setClients(d.clients || []); }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('digital_passports').upsert({ user_id: user.id, ...passport, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const createClient = async () => {
    if (!newClient.name.trim() || !newClient.redirect_uris.trim()) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCreating(false); return; }
    const res = await fetch(`${SSO_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        name: newClient.name,
        description: newClient.description,
        redirect_uris: newClient.redirect_uris.split('\n').map(s => s.trim()).filter(Boolean),
        logo_url: newClient.logo_url || undefined,
        scopes: ['openid', 'profile', 'email'],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setCreatedClient({ client_id: d.client_id, client_secret: d.client_secret });
      setShowNewClientForm(false);
      setNewClient({ name: '', description: '', redirect_uris: '', logo_url: '' });
      await loadClients();
    }
    setCreating(false);
  };

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #334155', borderRadius: 9, fontSize: 13, outline: 'none', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile',  label: '👤 Профиль' },
    { id: 'clients',  label: '🔑 OAuth-клиенты' },
    { id: 'security', label: '🛡️ Безопасность' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a237e,#1565c0)', padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{user?.username || 'Пользователь'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{user?.email}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>ID: {user?.id?.slice(0, 8)}...</div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#86efac', fontWeight: 700 }}>
            🪪 Чайка ID
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', border: tab === t.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Profile Tab */}
        {tab === 'profile' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                { key: 'first_name',  label: 'Имя',          ph: 'Иван' },
                { key: 'last_name',   label: 'Фамилия',       ph: 'Иванов' },
                { key: 'patronymic',  label: 'Отчество',      ph: 'Иванович' },
                { key: 'birth_date',  label: 'Дата рождения', ph: '', type: 'date' },
                { key: 'phone',       label: 'Телефон',       ph: '+7-999-000-00-00' },
                { key: 'city',        label: 'Город',         ph: 'Москва' },
                { key: 'country',     label: 'Страна',        ph: 'Россия' },
                { key: 'website',     label: 'Сайт',          ph: 'https://example.com' },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input type={f.type || 'text'} value={(passport as any)[f.key] || ''} onChange={e => setPassport(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inp} placeholder={f.ph} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Пол</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Мужской', 'М'], ['Женский', 'Ж'], ['Не указывать', '—']].map(([label, val]) => (
                  <button key={val} onClick={() => setPassport(p => ({ ...p, gender: val }))}
                    style={{ padding: '7px 14px', background: passport.gender === val ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${passport.gender === val ? '#7c3aed60' : '#334155'}`, borderRadius: 8, color: passport.gender === val ? '#a78bfa' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>О себе</label>
              <textarea value={passport.bio || ''} onChange={e => setPassport(p => ({ ...p, bio: e.target.value }))}
                rows={3} placeholder="Расскажите о себе..." style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
            </div>
            <button onClick={save} disabled={saving} style={{ padding: '11px 28px', background: saving ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
              {saved ? '✓ Сохранено!' : saving ? '...' : '💾 Сохранить профиль'}
            </button>
          </div>
        )}

        {/* OAuth Clients Tab */}
        {tab === 'clients' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>OAuth 2.0 Приложения</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Регистрация внешних сайтов для входа через Чайка ОС</div>
              </div>
              <button onClick={() => setShowNewClientForm(s => !s)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#1565c0,#1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Создать приложение
              </button>
            </div>

            {/* New client form */}
            {showNewClientForm && (
              <div style={{ background: '#0f1929', border: '1px solid #1565c060', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginBottom: 14 }}>Новое OAuth-приложение</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Название *</label>
                    <input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="Мой сайт" />
                  </div>
                  <div>
                    <label style={lbl}>URL логотипа</label>
                    <input value={newClient.logo_url} onChange={e => setNewClient(p => ({ ...p, logo_url: e.target.value }))} style={inp} placeholder="https://example.com/logo.png" />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Описание</label>
                  <input value={newClient.description} onChange={e => setNewClient(p => ({ ...p, description: e.target.value }))} style={inp} placeholder="Описание приложения" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Разрешённые redirect_uri * (по одному на строку)</label>
                  <textarea value={newClient.redirect_uris} onChange={e => setNewClient(p => ({ ...p, redirect_uris: e.target.value }))}
                    rows={3} placeholder="https://example.com/callback&#10;https://localhost:3000/callback" style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={createClient} disabled={creating} style={{ padding: '9px 20px', background: creating ? '#334155' : '#1565c0', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: creating ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {creating ? '...' : '✓ Создать'}
                  </button>
                  <button onClick={() => setShowNewClientForm(false)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #334155', borderRadius: 9, color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                </div>
              </div>
            )}

            {/* Credentials display */}
            {createdClient && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#86efac', marginBottom: 10 }}>✓ Приложение создано! Сохраните credentials:</div>
                {[['Client ID', createdClient.client_id], ['Client Secret', createdClient.client_secret]].map(([l, v]) => (
                  <div key={l} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 3 }}>{l}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <code style={{ flex: 1, background: '#0f172a', padding: '7px 10px', borderRadius: 7, fontSize: 11, fontFamily: 'Consolas, monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{v}</code>
                      <button onClick={() => navigator.clipboard.writeText(v)} style={{ padding: '5px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, color: '#86efac', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>📋</button>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>⚠️ Client Secret показывается только один раз. Сохраните его в безопасном месте!</div>
                <button onClick={() => setCreatedClient(null)} style={{ marginTop: 8, padding: '4px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Закрыть</button>
              </div>
            )}

            {/* Client list */}
            {clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Нет зарегистрированных приложений</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Создайте OAuth-клиент для интеграции вашего сайта</div>
              </div>
            ) : clients.map(c => (
              <div key={c.id} style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.description}</div>}
                  </div>
                  <span style={{ padding: '3px 10px', background: c.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${c.is_active ? '#22c55e60' : '#ef444460'}`, borderRadius: 8, fontSize: 10, fontWeight: 700, color: c.is_active ? '#86efac' : '#fca5a5' }}>
                    {c.is_active ? '✓ Активен' : '✗ Отключён'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#475569' }}>Client ID:</div>
                  <code style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'Consolas, monospace' }}>{c.client_id}</code>
                  <button onClick={() => navigator.clipboard.writeText(c.client_id)} style={{ padding: '1px 6px', background: 'none', border: '1px solid #1e3a5f', borderRadius: 4, color: '#475569', fontSize: 9, cursor: 'pointer' }}>📋</button>
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  Redirect URIs: {c.redirect_uris.join(', ')} · Scopes: {c.scopes.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>🛡️ Безопасность аккаунта</div>
            {[
              { icon: '✅', label: 'Email подтверждён', desc: user?.email || '', color: '#22c55e' },
              { icon: '🔑', label: 'Пароль установлен', desc: 'Надёжная защита аккаунта', color: '#3b82f6' },
              { icon: '🪪', label: 'Чайка ID активен', desc: `ID: ${user?.id?.slice(0, 16)}...`, color: '#8b5cf6' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#0f1929', border: `1px solid ${item.color}30`, borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '16px 18px', marginTop: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>Сведения о SSO</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
                Ваш Чайка ID позволяет входить на сторонние сайты через единый вход OAuth2.0/OIDC.<br />
                ISSUER: <code style={{ color: '#60a5fa', fontFamily: 'Consolas, monospace', fontSize: 11 }}>edmxgfiyabbptsjeedmx.backend.onspace.ai/functions/v1/chaika-sso</code>
              </div>
              <button onClick={() => window.open('/sso-guide', '_blank')} style={{ marginTop: 10, padding: '7px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 9, color: '#fbbf24', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                📖 Документация SSO →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
