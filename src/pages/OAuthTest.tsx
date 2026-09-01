/**
 * Чайка ОС — OAuth2.0 Test Page
 * Полный тест OAuth2.0 / OIDC flow в браузере
 */
import React, { useState, useEffect, useCallback } from 'react';

const SSO_BASE = 'https://edmxgfiyabbptsjeedmx.backend.onspace.ai/functions/v1/chaika-sso';
const AUTH_EP  = `${window.location.origin}/oauth/authorize`;

async function generatePKCE() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const verifier = btoa(String.fromCharCode(...arr)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return { verifier, challenge };
}

type Step = 'config' | 'authorize' | 'callback' | 'token' | 'userinfo';

export default function OAuthTest() {
  const [step, setStep] = useState<Step>('config');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(`${window.location.origin}/oauth/test`);
  const [scopes, setScopes] = useState('openid profile email');
  const [pkce, setPkce] = useState<{ verifier: string; challenge: string } | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [state, setState] = useState('');
  const [tokens, setTokens] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'error' | 'req' }[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'req' = 'info') => {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString('ru-RU'), msg, type }]);
  };

  // Check if we're returning from OAuth consent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const st = params.get('state');
    const err = params.get('error');

    if (err) {
      setError(`OAuth Error: ${err} — ${params.get('error_description') || ''}`);
      addLog(`OAuth ошибка: ${err}`, 'error');
      window.history.replaceState({}, '', '/oauth/test');
      setStep('callback');
      return;
    }

    if (code) {
      setAuthCode(code);
      if (st) setState(st);
      addLog(`✓ Получен код авторизации: ${code.slice(0, 12)}...`, 'success');

      // Restore PKCE verifier from session
      const savedVerifier = sessionStorage.getItem('chaika_oauth_test_verifier');
      const savedClientId = sessionStorage.getItem('chaika_oauth_test_client_id');
      const savedClientSecret = sessionStorage.getItem('chaika_oauth_test_client_secret');
      if (savedVerifier) setPkce(prev => ({ ...(prev || { challenge: '' }), verifier: savedVerifier }));
      if (savedClientId) setClientId(savedClientId);
      if (savedClientSecret) setClientSecret(savedClientSecret);

      window.history.replaceState({}, '', '/oauth/test');
      setStep('callback');
    }
  }, []);

  const handleStartFlow = useCallback(async () => {
    if (!clientId) { setError('Введите Client ID'); return; }
    setError(null);
    setLoading(true);

    const pkceData = await generatePKCE();
    setPkce(pkceData);

    const newState = Math.random().toString(36).slice(2);
    sessionStorage.setItem('chaika_oauth_test_verifier', pkceData.verifier);
    sessionStorage.setItem('chaika_oauth_test_client_id', clientId);
    sessionStorage.setItem('chaika_oauth_test_client_secret', clientSecret);

    const url = new URL(AUTH_EP);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', newState);
    url.searchParams.set('code_challenge', pkceData.challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    addLog(`→ Redirect to consent page...`, 'req');
    addLog(`URL: ${url.toString().slice(0, 80)}...`, 'info');
    setLoading(false);
    window.location.href = url.toString();
  }, [clientId, clientSecret, redirectUri, scopes]);

  const handleTokenExchange = async () => {
    if (!authCode) { setError('Нет кода авторизации'); return; }
    setError(null);
    setLoading(true);
    addLog(`→ POST ${SSO_BASE}/token`, 'req');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: authCode,
      redirect_uri: redirectUri,
      ...(pkce ? { code_verifier: pkce.verifier } : {}),
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });

    const res = await fetch(`${SSO_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error_description || data.error || 'Token exchange failed');
      addLog(`✗ Token error: ${data.error}`, 'error');
      return;
    }

    setTokens(data);
    addLog(`✓ Получены токены: access_token=${data.access_token?.slice(0, 12)}...`, 'success');
    setStep('token');
  };

  const handleUserInfo = async () => {
    if (!tokens?.access_token) { setError('Нет access_token'); return; }
    setError(null);
    setLoading(true);
    addLog(`→ GET ${SSO_BASE}/userinfo`, 'req');

    const res = await fetch(`${SSO_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Userinfo failed');
      addLog(`✗ Userinfo error`, 'error');
      return;
    }

    setUserInfo(data);
    addLog(`✓ Получена информация о пользователе: ${data.email}`, 'success');
    setStep('userinfo');
  };

  const handleRegisterClient = async () => {
    const jwt = prompt('Введите ваш JWT (access_token из Supabase):');
    if (!jwt) return;
    setError(null);
    setLoading(true);

    const res = await fetch(`${SSO_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        name: 'Test Client',
        description: 'OAuth Test Page',
        redirect_uris: [redirectUri],
        scopes: ['openid', 'profile', 'email'],
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Registration failed');
      return;
    }

    setClientId(data.client_id || '');
    setClientSecret(data.client_secret || '');
    addLog(`✓ Клиент зарегистрирован: ${data.client_id}`, 'success');
  };

  const STEPS: { id: Step; label: string; done: boolean }[] = [
    { id: 'config', label: '① Настройка', done: step !== 'config' },
    { id: 'authorize', label: '② Авторизация', done: ['callback', 'token', 'userinfo'].includes(step) },
    { id: 'callback', label: '③ Callback', done: ['token', 'userinfo'].includes(step) },
    { id: 'token', label: '④ Токены', done: step === 'userinfo' },
    { id: 'userinfo', label: '⑤ Userinfo', done: false },
  ];

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#0f172a',
    border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Consolas, monospace',
  };

  const logColors = { info: '#94a3b8', success: '#86efac', error: '#fca5a5', req: '#60a5fa' };

  return (
    <div style={{ minHeight: '100vh', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', padding: 0 }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(2,8,16,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 28px', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 800, background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🕊️ Чайка ОС</a>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>OAuth2.0 Test</span>
        <div style={{ flex: 1 }} />
        <a href="/sso-guide" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>📚 Документация</a>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🔬 OAuth 2.0 / OIDC Тестирование</h1>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Интерактивный тест всего OAuth2.0 потока с поддержкой PKCE, обменом токенов и запросом userinfo.
        </p>

        {/* Steps progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div onClick={() => s.done && setStep(s.id)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: s.done ? 'pointer' : 'default', whiteSpace: 'nowrap',
                background: step === s.id ? 'rgba(124,58,237,0.2)' : s.done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${step === s.id ? '#7c3aed' : s.done ? '#22c55e50' : '#1e3a5f'}`,
                color: step === s.id ? '#c4b5fd' : s.done ? '#86efac' : '#475569',
              }}>
                {s.done ? '✓ ' : ''}{s.label}
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: '#1e3a5f', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ① Config */}
            <div style={{ background: '#0f1929', border: `1px solid ${step === 'config' ? '#7c3aed60' : '#1e3a5f'}`, borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: step === 'config' ? '#c4b5fd' : '#60a5fa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                ① Конфигурация клиента
                <button onClick={handleRegisterClient} disabled={loading} style={{ marginLeft: 'auto', padding: '5px 14px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 7, color: '#c4b5fd', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  + Регистрация (требует JWT)
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>CLIENT ID</label>
                  <input style={inp} value={clientId} onChange={e => setClientId(e.target.value)} placeholder="chaika_abc123..." />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>CLIENT SECRET (опционально, PKCE)</label>
                  <input style={inp} type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Оставьте пустым для PKCE" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>REDIRECT URI</label>
                <input style={inp} value={redirectUri} onChange={e => setRedirectUri(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>SCOPES</label>
                <input style={inp} value={scopes} onChange={e => setScopes(e.target.value)} placeholder="openid profile email" />
              </div>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</div>}
              <button onClick={handleStartFlow} disabled={loading} style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                {loading ? '⟳ Запуск...' : '▶ Запустить OAuth Flow (PKCE)'}
              </button>
            </div>

            {/* ③ Callback */}
            {(step === 'callback' || step === 'token' || step === 'userinfo') && (
              <div style={{ background: '#0f1929', border: `1px solid ${authCode ? '#22c55e40' : '#ef444440'}`, borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', marginBottom: 14 }}>③ Callback — Код авторизации</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>AUTHORIZATION CODE</label>
                  <input style={inp} value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="Автоматически из redirect..." />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 700 }}>STATE</label>
                  <input style={inp} value={state} onChange={e => setState(e.target.value)} placeholder="State parameter" readOnly />
                </div>
                {pkce && (
                  <div style={{ background: '#0a1628', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>PKCE VERIFIER (generated)</div>
                    <code style={{ fontSize: 11, color: '#86efac', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{pkce.verifier}</code>
                  </div>
                )}
                <button onClick={handleTokenExchange} disabled={loading || !authCode} style={{ padding: '11px 24px', background: authCode ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#334155', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: authCode ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  {loading ? '⟳ Обмен...' : '④ Обменять на токены'}
                </button>
              </div>
            )}

            {/* ④ Tokens */}
            {(step === 'token' || step === 'userinfo') && tokens && (
              <div style={{ background: '#0f1929', border: '1px solid #22c55e40', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', marginBottom: 14 }}>④ Токены</div>
                <pre style={{ background: '#0a1628', borderRadius: 10, padding: '14px', fontSize: 12, fontFamily: 'Consolas, monospace', color: '#a5b4fc', overflow: 'auto', maxHeight: 220, margin: '0 0 14px', lineHeight: 1.6 }}>
                  {JSON.stringify(tokens, null, 2)}
                </pre>
                <button onClick={handleUserInfo} disabled={loading} style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? '⟳ Загрузка...' : '⑤ Получить UserInfo'}
                </button>
              </div>
            )}

            {/* ⑤ Userinfo */}
            {step === 'userinfo' && userInfo && (
              <div style={{ background: '#0f1929', border: '1px solid #60a5fa40', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', marginBottom: 14 }}>⑤ Данные пользователя (OpenID Connect)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
                  {Object.entries(userInfo).map(([k, v]) => (
                    <div key={k} style={{ background: '#0a1628', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 2 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, fontSize: 13, color: '#86efac' }}>
                  ✓ OAuth 2.0 + OpenID Connect flow успешно завершён!
                </div>
              </div>
            )}
          </div>

          {/* Log panel */}
          <div style={{ position: 'sticky', top: 68, height: 'fit-content' }}>
            <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>📋 Журнал запросов</span>
                <button onClick={() => setLog([])} style={{ padding: '3px 10px', background: 'none', border: '1px solid #1e3a5f', borderRadius: 5, color: '#475569', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Очистить</button>
              </div>
              <div style={{ maxHeight: 480, overflowY: 'auto', padding: '10px 14px', fontFamily: 'Consolas, monospace', fontSize: 11 }}>
                {log.length === 0 ? (
                  <div style={{ color: '#334155', textAlign: 'center', padding: '20px 0' }}>Запросы появятся здесь...</div>
                ) : log.map((entry, i) => (
                  <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#334155', flexShrink: 0 }}>{entry.time}</span>
                    <span style={{ color: logColors[entry.type], wordBreak: 'break-all', lineHeight: 1.5 }}>{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PKCE info */}
            <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '16px', marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>ℹ PKCE (S256)</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                Используется <strong style={{ color: '#94a3b8' }}>code_challenge_method=S256</strong>.<br />
                code_verifier → SHA-256 → Base64URL = code_challenge.<br />
                client_secret не обязателен при PKCE.
              </div>
            </div>

            {/* Quick reference */}
            <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '16px', marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>🔗 Endpoints</div>
              {[
                ['/authorize/approve', 'Consent POST'],
                ['/token', 'Token exchange'],
                ['/userinfo', 'User data'],
                ['/introspect', 'Token check'],
                ['/revoke', 'Revoke token'],
              ].map(([path, label]) => (
                <div key={path} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                  <code style={{ color: '#60a5fa', fontFamily: 'Consolas, monospace' }}>{path}</code>
                  <span style={{ color: '#475569' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
