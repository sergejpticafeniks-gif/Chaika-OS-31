/**
 * Чайка ОС — OAuth2.0 Consent Page
 * URL: /oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...&code_challenge=...
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const SSO_BASE = 'https://edmxgfiyabbptsjeedmx.backend.onspace.ai/functions/v1/chaika-sso';

interface OAuthClient {
  client_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  redirect_uris: string[];
  scopes: string[];
}

const SCOPE_DESCRIPTIONS: Record<string, { label: string; desc: string; icon: string }> = {
  openid:         { label: 'Идентификация',      desc: 'Подтверждение личности через Чайка ОС',            icon: '🪪' },
  profile:        { label: 'Профиль',            desc: 'Имя, username, город регистрации',                 icon: '👤' },
  email:          { label: 'Электронная почта',  desc: 'Адрес электронной почты вашего аккаунта',         icon: '📧' },
  offline_access: { label: 'Автоматический вход',desc: 'Оставаться в системе без повторного входа',        icon: '🔄' },
  'filesystem:read': { label: 'Файлы (чтение)', desc: 'Читать файлы вашего рабочего стола',              icon: '📁' },
  'messenger:send':  { label: 'Мессенджер',      desc: 'Отправлять сообщения от вашего имени',            icon: '🕊️' },
};

export default function OAuthConsent() {
  const { user } = useAuth();
  const [client, setClient]     = useState<OAuthClient | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Parse URL params
  const params      = new URLSearchParams(window.location.search);
  const clientId    = params.get('client_id')    ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const scopeStr    = params.get('scope')        ?? 'openid profile email';
  const state       = params.get('state')        ?? '';
  const codeChallenge       = params.get('code_challenge')        ?? '';
  const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256';
  const scopes = scopeStr.split(' ').filter(Boolean);

  useEffect(() => {
    if (!clientId) { setError('Отсутствует client_id'); setLoading(false); return; }
    // Fetch client info from Supabase directly
    supabase.from('oauth_clients').select('client_id,name,description,logo_url,redirect_uris,scopes').eq('client_id', clientId).eq('is_active', true).single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError('Приложение не найдено или отключено'); setLoading(false); return; }
        if (!data.redirect_uris.includes(redirectUri)) { setError('redirect_uri не разрешён для данного приложения'); setLoading(false); return; }
        setClient(data as OAuthClient);
        setLoading(false);
      });
  }, [clientId, redirectUri]);

  // If not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/?oauth_return=${returnUrl}`;
    }
  }, [loading, user]);

  const handleApprove = async () => {
    if (!user) return;
    setApproving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Сессия истекла. Войдите снова.'); setApproving(false); return; }

    const res = await fetch(`${SSO_BASE}/authorize/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        scopes,
        state,
        code_challenge:        codeChallenge        || undefined,
        code_challenge_method: codeChallengeMethod  || undefined,
      }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setError(e.error || 'Ошибка при создании кода авторизации');
      setApproving(false);
      return;
    }

    const { code, state: retState, redirect_uri: retUri } = await res.json();
    const dest = new URL(retUri);
    dest.searchParams.set('code', code);
    if (retState) dest.searchParams.set('state', retState);
    window.location.href = dest.toString();
  };

  const handleDeny = () => {
    const dest = new URL(redirectUri);
    dest.searchParams.set('error', 'access_denied');
    dest.searchParams.set('error_description', 'User denied access');
    if (state) dest.searchParams.set('state', state);
    window.location.href = dest.toString();
  };

  // ── Styles ────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#050d1a 0%,#0f172a 50%,#1e1b4b 100%)',
    fontFamily: "'Segoe UI', sans-serif", padding: 24,
  };
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24, padding: '36px 40px', maxWidth: 440, width: '100%',
    backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  };

  if (loading) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Загружаем информацию о приложении...</div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Ошибка авторизации</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{error}</div>
          <button onClick={() => window.history.back()} style={{ marginTop: 20, padding: '10px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Назад</button>
        </div>
      </div>
    </div>
  );

  if (!client) return null;

  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            {/* App logo */}
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, overflow: 'hidden' }}>
              {client.logo_url ? <img src={client.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🌐'}
            </div>
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>⇄</div>
            {/* Chaika logo */}
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🕊️</div>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            {client.name}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {client.description || 'Запрашивает доступ к вашему аккаунту Чайка ОС'}
          </p>
        </div>

        {/* User info */}
        {user && (
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.username}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{user.email}</div>
            </div>
          </div>
        )}

        {/* Scopes */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Запрошенные разрешения</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scopes.map(scope => {
              const info = SCOPE_DESCRIPTIONS[scope];
              return (
                <div key={scope} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{info?.icon ?? '🔑'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{info?.label ?? scope}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{info?.desc ?? scope}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>✓</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleDeny} style={{ flex: 1, padding: '12px 0', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#fca5a5', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}>
            ✗ Отклонить
          </button>
          <button onClick={handleApprove} disabled={approving} style={{ flex: 2, padding: '12px 0', background: approving ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: approving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: approving ? 'none' : '0 4px 20px rgba(124,58,237,0.5)', transition: 'all 0.15s' }}>
            {approving ? '⟳ Обработка...' : '✓ Разрешить доступ'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 16, lineHeight: 1.6 }}>
          Нажимая «Разрешить», вы авторизуете <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{client.name}</strong> на доступ к вашему аккаунту Чайка ОС в соответствии с условиями OAuth2.0 / OIDC.
        </p>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/sso-guide" target="_blank" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            Что такое единый вход Чайка? →
          </a>
        </div>
      </div>
    </div>
  );
}
