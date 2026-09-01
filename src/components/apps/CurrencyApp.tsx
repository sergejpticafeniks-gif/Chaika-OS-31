/**
 * Чайка ОС — Курсы валют
 * API: open.er-api.com (free, no key)
 */
import React, { useState, useEffect, useRef } from 'react';

const ALERTS_KEY = 'chaika_currency_alerts';
interface CurrencyAlert {
  id: string; fromCur: string; toCur: string;
  threshold: number; direction: 'above' | 'below'; active: boolean;
}
function loadAlerts(): CurrencyAlert[] { try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]'); } catch { return []; } }
function saveAlerts(a: CurrencyAlert[]) { localStorage.setItem(ALERTS_KEY, JSON.stringify(a)); }

const CURRENCIES: Record<string, { name: string; flag: string }> = {
  RUB: { name: 'Российский рубль',    flag: '🇷🇺' },
  USD: { name: 'Доллар США',          flag: '🇺🇸' },
  EUR: { name: 'Евро',                flag: '🇪🇺' },
  CNY: { name: 'Китайский юань',      flag: '🇨🇳' },
  GBP: { name: 'Фунт стерлингов',     flag: '🇬🇧' },
  JPY: { name: 'Японская иена',       flag: '🇯🇵' },
  KZT: { name: 'Казахстанский тенге', flag: '🇰🇿' },
  BYN: { name: 'Белорусский рубль',   flag: '🇧🇾' },
  UAH: { name: 'Гривна',              flag: '🇺🇦' },
  TRY: { name: 'Турецкая лира',       flag: '🇹🇷' },
  AED: { name: 'Дирхам ОАЭ',          flag: '🇦🇪' },
  INR: { name: 'Индийская рупия',     flag: '🇮🇳' },
  BRL: { name: 'Бразильский реал',    flag: '🇧🇷' },
  CHF: { name: 'Швейцарский франк',   flag: '🇨🇭' },
};

const POPULAR_PAIRS = [
  { from: 'USD', to: 'RUB' },
  { from: 'EUR', to: 'RUB' },
  { from: 'CNY', to: 'RUB' },
  { from: 'GBP', to: 'RUB' },
];

export default function CurrencyApp() {
  const [rates, setRates]       = useState<Record<string, number>>({});
  const [base, setBase]         = useState('USD');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [amount, setAmount]     = useState('100');
  const [fromCur, setFromCur]   = useState('USD');
  const [toCur, setToCur]       = useState('RUB');
  const [lastUpdate, setLastUpdate] = useState('');
  const [alerts, setAlerts] = useState<CurrencyAlert[]>(loadAlerts);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertFrom, setAlertFrom] = useState('USD');
  const [alertTo, setAlertTo] = useState('RUB');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertDir, setAlertDir] = useState<'above' | 'below'>('above');
  const alertIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const ratesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        const data = await res.json();
        if (data.result !== 'success') throw new Error('API error');
        setRates(data.rates);
        setLastUpdate(new Date(data.time_last_update_utc).toLocaleString('ru-RU'));
      } catch {
        setError('Не удалось загрузить курсы. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    load().then(() => { ratesRef.current = rates; });
  }, [base]);

  // Keep ratesRef in sync
  useEffect(() => { ratesRef.current = rates; }, [rates]);

  // Alert checker — every 30 minutes
  useEffect(() => {
    const checkAlerts = () => {
      const stored = loadAlerts();
      stored.filter(a => a.active).forEach(alert => {
        const r = ratesRef.current;
        if (!r[alert.fromCur] || !r[alert.toCur]) return;
        const rate = (1 / r[alert.fromCur]) * r[alert.toCur];
        const triggered = alert.direction === 'above' ? rate >= alert.threshold : rate <= alert.threshold;
        if (triggered) {
          window.dispatchEvent(new CustomEvent('chaika-notification', { detail: {
            title: `💱 Курс ${alert.fromCur}/${alert.toCur}`,
            body: `Курс ${rate.toFixed(2)} ${alert.direction === 'above' ? '≥' : '≤'} ${alert.threshold}`,
          }}));
          // Deactivate after firing
          const updated = stored.map(a => a.id === alert.id ? { ...a, active: false } : a);
          saveAlerts(updated); setAlerts(updated);
        }
      });
    };
    alertIntervalRef.current = setInterval(checkAlerts, 30 * 60 * 1000);
    return () => clearInterval(alertIntervalRef.current);
  }, []);

  const convert = (from: string, to: string, amt: number): number => {
    if (!rates[from] || !rates[to]) return 0;
    return (amt / rates[from]) * rates[to];
  };

  const result = convert(fromCur, toCur, parseFloat(amount) || 0);

  const swap = () => { setFromCur(toCur); setToCur(fromCur); };

  const selStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1px solid #334155', borderRadius: 10,
    background: '#0f172a', color: '#e2e8f0', fontSize: 14, outline: 'none',
    fontFamily: 'Segoe UI, sans-serif', cursor: 'pointer', flex: 1,
  };
  const inpStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', border: '1px solid #334155', borderRadius: 12,
    background: '#0f172a', color: '#fff', fontSize: 22, fontWeight: 700, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '16px 20px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', marginBottom: 2 }}>💱 Курсы валют</div>
        <div style={{ fontSize: 11, color: '#475569' }}>Данные: open.er-api.com · Обновлено: {lastUpdate || '—'}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Converter */}
        <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 14 }}>Конвертер</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5 }}>Сумма</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inpStyle} placeholder="100" />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5 }}>Из</label>
              <select value={fromCur} onChange={e => setFromCur(e.target.value)} style={selStyle}>
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {code} — {info.name}</option>
                ))}
              </select>
            </div>
            <button onClick={swap} style={{ padding: '10px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, color: '#60a5fa', fontSize: 18, cursor: 'pointer', flexShrink: 0, marginTop: 18 }}>⇄</button>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5 }}>В</label>
              <select value={toCur} onChange={e => setToCur(e.target.value)} style={selStyle}>
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {code} — {info.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '16px 0' }}>Загрузка курсов...</div>
          ) : error ? (
            <div style={{ color: '#f87171', fontSize: 13, padding: '12px 0' }}>{error}</div>
          ) : (
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1565c0)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                {amount || '0'} {CURRENCIES[fromCur]?.flag} {fromCur} =
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
                {result.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {toCur}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                1 {fromCur} = {convert(fromCur, toCur, 1).toFixed(4)} {toCur}
              </div>
            </div>
          )}
        </div>

        {/* Popular pairs */}
        <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>Популярные пары</div>
          {!loading && !error && POPULAR_PAIRS.map((pair, i) => {
            const rate = convert(pair.from, pair.to, 1);
            const rate100 = convert(pair.from, pair.to, 100);
            return (
              <div key={i} onClick={() => { setFromCur(pair.from); setToCur(pair.to); setAmount('100'); }}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid #1e3a5f' : 'none', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {CURRENCIES[pair.from]?.flag} {pair.from}/{pair.to}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>100 {pair.from}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{rate100.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {pair.to}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>1 {pair.from} = {rate.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Alerts Section ── */}
      <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAlerts ? 14 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>🔔 Ценовые алерты ({alerts.filter(a => a.active).length} активных)</div>
          <button onClick={() => setShowAlerts(s => !s)} style={{ padding: '5px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7, color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            {showAlerts ? '▲ Скрыть' : '▼ Настроить'}
          </button>
        </div>
        {showAlerts && (
          <>
            {/* Add alert form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>ПАРА</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <select value={alertFrom} onChange={e => setAlertFrom(e.target.value)} style={{ flex: 1, padding: '7px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
                    {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#475569' }}>/</span>
                  <select value={alertTo} onChange={e => setAlertTo(e.target.value)} style={{ flex: 1, padding: '7px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
                    {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>УСЛОВИЕ</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <select value={alertDir} onChange={e => setAlertDir(e.target.value as 'above' | 'below')} style={{ padding: '7px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
                    <option value="above">≥ Выше</option>
                    <option value="below">≤ Ниже</option>
                  </select>
                  <input type="number" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} placeholder="Порог" style={{ flex: 1, padding: '7px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
            </div>
            <button onClick={() => {
              if (!alertThreshold) return;
              const a: CurrencyAlert = { id: Date.now().toString(), fromCur: alertFrom, toCur: alertTo, threshold: parseFloat(alertThreshold), direction: alertDir, active: true };
              const next = [...alerts, a]; saveAlerts(next); setAlerts(next); setAlertThreshold('');
            }} style={{ width: '100%', padding: '9px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 9, color: '#86efac', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>+ Добавить алерт (проверка каждые 30 мин)</button>
            {/* Alerts list */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${a.active ? '#22c55e30' : '#1e3a5f'}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 16 }}>{a.active ? '🔔' : '🔕'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{a.fromCur}/{a.toCur}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{a.direction === 'above' ? '≥' : '≤'} {a.threshold}</span>
                    </div>
                    <button onClick={() => { const n = alerts.map(x => x.id === a.id ? { ...x, active: !x.active } : x); saveAlerts(n); setAlerts(n); }} style={{ padding: '3px 8px', background: 'none', border: '1px solid #334155', borderRadius: 5, color: '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>{a.active ? 'Откл.' : 'Вкл.'}</button>
                    <button onClick={() => { const n = alerts.filter(x => x.id !== a.id); saveAlerts(n); setAlerts(n); }} style={{ padding: '3px 8px', background: 'none', border: '1px solid #334155', borderRadius: 5, color: '#f87171', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* All currencies grid */}
        {!loading && !error && (
          <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>Все курсы к {base}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <select value={base} onChange={e => setBase(e.target.value)} style={{ ...selStyle, flex: 'none', width: 160 }}>
                {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
              {Object.entries(CURRENCIES).map(([code, info]) => {
                if (code === base) return null;
                const r = rates[code];
                return (
                  <div key={code} onClick={() => { setFromCur(base); setToCur(code); }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a5f'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{info.flag}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{code}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{r?.toFixed(code === 'JPY' || code === 'KZT' ? 0 : 2)}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{info.name}</div>
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
