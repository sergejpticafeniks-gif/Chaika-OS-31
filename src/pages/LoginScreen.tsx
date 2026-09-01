import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, mapSupabaseUser } from '@/contexts/AuthContext';

type Screen = 'select' | 'login' | 'register-email' | 'register-otp' | 'register-pass' | 'reset-email' | 'reset-otp' | 'reset-pass';

const FEATURES = [
  { icon: '🔐', text: 'Аппаратный ключ HASP' },
  { icon: '🌐', text: '50+ встроенных приложений' },
  { icon: '🤖', text: 'AI-ассистент Чайка' },
  { icon: '📡', text: 'Облачное хранилище файлов' },
  { icon: '🕊️', text: 'Мессенджер с каналами' },
  { icon: '🔐', text: 'Единый вход OAuth 2.0' },
];

const DEVICE_SPECS = [
  { label: 'Процессор', value: 'Baikal-M / Эльбрус-8С' },
  { label: 'Память', value: '16–64 ГБ LPDDR5' },
  { label: 'Экран', value: '13.3" / 15.6" IPS 2K' },
  { label: 'ОС', value: 'Чайка ОС v31' },
  { label: 'Сертификат', value: 'ФСТЭК России' },
];

function StarField() {
  const stars = React.useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 0.5 + Math.random() * 2,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.r * 2, height: s.r * 2,
          borderRadius: '50%',
          background: `rgba(255,255,255,${0.3 + Math.random() * 0.6})`,
          animation: `starBlink ${s.dur}s ${s.delay}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes starBlink { from { opacity: 0.1; } to { opacity: 1; } }
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(200vh)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 12px rgba(124,58,237,0.4)} 50%{box-shadow:0 0 30px rgba(124,58,237,0.9),0 0 60px rgba(99,102,241,0.5)} }
        @keyframes badgePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.04)} }
        @keyframes loginSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes deviceFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
      `}</style>
    </div>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [screen, setScreen] = useState<Screen>('select');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [time, setTime]     = useState(new Date());
  const [deviceImg, setDeviceImg] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setDeviceImg(n => (n + 1) % 2), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (screen === 'login') setTimeout(() => passwordRef.current?.focus(), 100);
  }, [screen]);

  const handleLogin = async () => {
    if (!email || !password) { setError('Введите email и пароль'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) login(mapSupabaseUser(data.user));
  };

  const handleSendOtp = async () => {
    if (!email) { setError('Введите email'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (err) { setError(err.message); setLoading(false); return; }
    setLoading(false);
    setScreen('register-otp');
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Введите код'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (err) { setError(err.message); setLoading(false); return; }
    setLoading(false);
    setScreen('register-pass');
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 6) { setError('Пароль не менее 6 символов'); return; }
    if (!username) { setError('Введите имя пользователя'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.updateUser({ password, data: { username } });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) login(mapSupabaseUser(data.user));
  };

  const handleResetSendOtp = async () => {
    if (!email) { setError('Введите email'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (err) { setError(err.message); setLoading(false); return; }
    setLoading(false);
    setScreen('reset-otp');
  };

  const handleResetVerifyOtp = async () => {
    if (!otp) { setError('Введите код'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (err) { setError(err.message); setLoading(false); return; }
    setLoading(false);
    setScreen('reset-pass');
  };

  const handleResetPassword = async () => {
    if (!password || password.length < 6) { setError('Пароль не менее 6 символов'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) login(mapSupabaseUser(data.user));
  };

  const goBack = (to: Screen) => { setScreen(to); setError(''); };

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const deviceImages = ['/chaika-device-1.jpg', '/chaika-device-2.jpg'];

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none',
    fontFamily: "'Segoe UI', sans-serif", boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const renderForm = () => {
    const base = { animation: 'loginSlide 0.3s ease-out' };

    if (screen === 'select') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => setScreen('login')}
          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, color: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Войти в систему</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Использовать существующий аккаунт</div>
          </div>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>›</span>
        </button>

        <button
          onClick={() => setScreen('register-email')}
          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, color: '#c4b5fd', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Создать аккаунт</div>
            <div style={{ fontSize: 12, color: 'rgba(196,181,253,0.7)', marginTop: 2 }}>Бесплатно · Россия · 152-ФЗ</div>
          </div>
          <span style={{ fontSize: 20, color: 'rgba(196,181,253,0.4)' }}>›</span>
        </button>
      </div>
    );

    if (screen === 'login') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>👤</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Вход в систему</div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', gap: 8, alignItems: 'center' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.ru" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Пароль</label>
          <input ref={passwordRef} style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.5)', transition: 'all 0.15s', animation: 'pulseGlow 2s ease-in-out infinite' }}>
          {loading ? '⟳ Вход...' : '➤ Войти в Чайка ОС'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => goBack('select')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Назад</button>
          <button onClick={() => goBack('reset-email')} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 13, cursor: 'pointer', padding: 0 }}>🔑 Забыли пароль?</button>
        </div>
      </div>
    );

    if (screen === 'register-email') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Регистрация</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Шаг 1 из 3 — Введите email</div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.ru" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
        </div>
        <button onClick={handleSendOtp} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          {loading ? '⟳ Отправка...' : '📧 Получить код на email'}
        </button>
        <button onClick={() => goBack('select')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
      </div>
    );

    if (screen === 'register-otp') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📧</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Подтверждение</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Шаг 2 из 3 — Код из письма</div>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#a5b4fc', textAlign: 'center' }}>
          Код отправлен на <strong style={{ color: '#fff' }}>{email}</strong>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Код подтверждения (4 цифры)</label>
          <input style={{ ...inp, textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 800 }} type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4} onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} />
        </div>
        <button onClick={handleVerifyOtp} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          {loading ? '⟳ Проверка...' : '✓ Подтвердить код'}
        </button>
        <button onClick={() => goBack('register-email')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
      </div>
    );

    if (screen === 'register-pass') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Создание аккаунта</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Шаг 3 из 3 — Ваш профиль</div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Имя пользователя</label>
          <input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ваше имя" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Пароль (мин. 6 символов)</label>
          <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleSetPassword()} />
        </div>
        <button onClick={handleSetPassword} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
          {loading ? '⟳ Создание...' : '🚀 Войти в Чайка ОС'}
        </button>
      </div>
    );

    if (screen === 'reset-email') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔑</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Сброс пароля</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Введите email — пришлём код</div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.ru" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleResetSendOtp()} />
        </div>
        <button onClick={handleResetSendOtp} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          {loading ? '⟳ Отправка...' : '📧 Получить код'}
        </button>
        <button onClick={() => goBack('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
      </div>
    );

    if (screen === 'reset-otp') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📧</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Подтверждение</div>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#a5b4fc', textAlign: 'center' }}>
          Код отправлен на <strong style={{ color: '#fff' }}>{email}</strong>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Код подтверждения</label>
          <input style={{ ...inp, textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 800 }} type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4} onKeyDown={e => e.key === 'Enter' && handleResetVerifyOtp()} />
        </div>
        <button onClick={handleResetVerifyOtp} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          {loading ? '⟳ Проверка...' : '✓ Подтвердить'}
        </button>
        <button onClick={() => goBack('reset-email')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
      </div>
    );

    if (screen === 'reset-pass') return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Новый пароль</div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>⚠ {error}</div>}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Новый пароль (мин. 6 символов)</label>
          <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'} onKeyDown={e => e.key === 'Enter' && handleResetPassword()} />
        </div>
        <button onClick={handleResetPassword} disabled={loading} style={{ padding: '14px', background: loading ? '#334155' : 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
          {loading ? '⟳ Сохранение...' : '✓ Установить пароль'}
        </button>
      </div>
    );

    return null;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050d1a', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden', position: 'relative' }}>
      <StarField />

      {/* ── LEFT PANEL — Device Showcase ── */}
      <div style={{ flex: '0 0 58%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="login-left-panel">
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(5,13,26,0.7) 0%,rgba(15,23,42,0.4) 50%,rgba(30,27,75,0.6) 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, background: 'linear-gradient(to right,transparent,#050d1a)', zIndex: 2 }} />

        {/* Device image background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {deviceImages.map((src, i) => (
            <img key={i} src={src} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              opacity: deviceImg === i ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out',
              filter: 'brightness(0.6) saturate(1.2)',
            }} />
          ))}
        </div>

        {/* Content over image */}
        <div style={{ position: 'relative', zIndex: 3, padding: '40px 48px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 20px rgba(124,58,237,0.5)' }}>🕊️</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>ЧАЙКА ОС</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>ВЕРСИЯ 31 · 2026</div>
            </div>
          </div>

          {/* Main copy */}
          <div style={{ marginBottom: 36 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 18, animation: 'badgePulse 2s ease-in-out infinite' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
              Скоро в продаже — Официальные устройства
            </div>

            <h1 style={{ fontSize: 'clamp(28px,3.5vw,52px)', fontWeight: 900, lineHeight: 1.1, color: '#fff', marginBottom: 12, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
              Первая российская<br />
              <span style={{ background: 'linear-gradient(90deg,#818cf8,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                облачная ОС
              </span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 440 }}>
              Разработана в России. Сертифицирована ФСТЭК. Работает на процессорах Baikal-M и Эльбрус.
            </p>
          </div>

          {/* Device specs */}
          <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 24px', marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>Характеристики устройства</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              {DEVICE_SPECS.map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Image dots indicator */}
          <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
            {deviceImages.map((_, i) => (
              <button key={i} onClick={() => setDeviceImg(i)} style={{ width: deviceImg === i ? 20 : 6, height: 6, borderRadius: 3, background: deviceImg === i ? '#7c3aed' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div style={{ flex: '0 0 42%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', zIndex: 10 }}>
        <StarField />

        {/* Time clock */}
        <div style={{ position: 'absolute', top: 24, right: 28, textAlign: 'right', zIndex: 2 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 1, lineHeight: 1 }}>{timeStr}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3, textTransform: 'capitalize' }}>{dateStr}</div>
        </div>

        {/* Login card */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 380 }}>
          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(124,58,237,0.6)', animation: 'floatUp 3s ease-in-out infinite' }}>🕊️</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase' }}>Добро пожаловать</div>
          </div>

          {/* Glass card */}
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            {renderForm()}
          </div>

          {/* Footer links */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <a href="/about" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>🌟 О системе</a>
            <a href="/sso-guide" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>🔐 Для разработчиков</a>
            <a href="/special" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>📖 API</a>
          </div>

          {/* Legal */}
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
            Защита данных 152-ФЗ · ФСТЭК России<br />
            © 2026 ОС Чайка. Все права защищены.
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
