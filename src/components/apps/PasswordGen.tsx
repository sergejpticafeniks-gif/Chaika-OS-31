/**
 * Чайка ОС — Генератор паролей
 */
import React, { useState, useCallback } from 'react';

const CHARSETS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: 'il1Lo0O',
};

function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { score, label: 'Слабый',       color: '#ef4444' };
  if (score <= 4) return { score, label: 'Средний',      color: '#f59e0b' };
  if (score <= 5) return { score, label: 'Хороший',      color: '#22c55e' };
  return { score, label: 'Отличный', color: '#10b981' };
}

function generate(opts: { length: number; upper: boolean; lower: boolean; digits: boolean; symbols: boolean; excludeSimilar: boolean; noAmbiguous: boolean }): string {
  let charset = '';
  if (opts.upper)   charset += CHARSETS.upper;
  if (opts.lower)   charset += CHARSETS.lower;
  if (opts.digits)  charset += CHARSETS.digits;
  if (opts.symbols) charset += CHARSETS.symbols;
  if (opts.excludeSimilar) charset = charset.split('').filter(c => !CHARSETS.similar.includes(c)).join('');
  if (!charset) charset = CHARSETS.lower + CHARSETS.digits;

  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => charset[v % charset.length]).join('');
}

interface HistoryEntry { pwd: string; len: number; time: string; }

export default function PasswordGen() {
  const [opts, setOpts] = useState({ length: 16, upper: true, lower: true, digits: true, symbols: true, excludeSimilar: false, noAmbiguous: false });
  const [password, setPassword] = useState(() => generate({ length: 16, upper: true, lower: true, digits: true, symbols: true, excludeSimilar: false, noAmbiguous: false }));
  const [count, setCount]       = useState(1);
  const [bulk, setBulk]         = useState<string[]>([]);
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [copied, setCopied]     = useState('');

  const generate_ = useCallback(() => {
    const pwd = generate(opts);
    setPassword(pwd);
    setHistory(h => [{ pwd, len: opts.length, time: new Date().toLocaleTimeString('ru-RU') }, ...h.slice(0, 19)]);
  }, [opts]);

  const generateBulk = useCallback(() => {
    const pwds = Array.from({ length: count }, () => generate(opts));
    setBulk(pwds);
    setHistory(h => [...pwds.map(p => ({ pwd: p, len: opts.length, time: new Date().toLocaleTimeString('ru-RU') })), ...h].slice(0, 20));
  }, [opts, count]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const strength = getStrength(password);

  const toggleOpt = (key: keyof typeof opts) => {
    if (typeof opts[key] === 'boolean') {
      setOpts(p => ({ ...p, [key]: !p[key as keyof typeof opts] }));
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '14px 20px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>🔑 Генератор паролей</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Криптографически стойкие пароли</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 20px' }}>
        {/* Generated password */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, fontFamily: 'Consolas, monospace', color: '#f1f5f9', wordBreak: 'break-all', marginBottom: 10, lineHeight: 1.4 }}>{password}</div>
          {/* Strength bar */}
          <div style={{ height: 6, background: '#0f172a', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(strength.score / 7) * 100}%`, background: strength.color, borderRadius: 3, transition: 'all 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: strength.color, fontWeight: 700 }}>{strength.label}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => generate_()} style={{ padding: '6px 14px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, color: '#a78bfa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🔄 Новый</button>
              <button onClick={() => copyText(password, 'main')} style={{ padding: '6px 14px', background: copied === 'main' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied === 'main' ? '#22c55e60' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, color: copied === 'main' ? '#86efac' : '#e2e8f0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.15s' }}>
                {copied === 'main' ? '✓ Скопировано' : '📋 Копировать'}
              </button>
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>Настройки</div>

          {/* Length slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              <span>Длина пароля</span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{opts.length}</span>
            </div>
            <input type="range" min={4} max={64} value={opts.length}
              onChange={e => setOpts(p => ({ ...p, length: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginTop: 2 }}>
              <span>4</span><span>16</span><span>32</span><span>64</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'upper',         label: 'Заглавные (A–Z)',     ex: 'ABC' },
              { key: 'lower',         label: 'Строчные (a–z)',      ex: 'abc' },
              { key: 'digits',        label: 'Цифры (0–9)',         ex: '123' },
              { key: 'symbols',       label: 'Символы (!@#...)',     ex: '!@#' },
              { key: 'excludeSimilar',label: 'Исключить похожие',    ex: 'il1Lo0' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: `1px solid ${opts[opt.key as keyof typeof opts] ? '#7c3aed60' : '#1e3a5f'}`, transition: 'all 0.15s' }}>
                <input type="checkbox" checked={!!opts[opt.key as keyof typeof opts]} onChange={() => toggleOpt(opt.key as keyof typeof opts)} style={{ accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Consolas, monospace' }}>{opt.ex}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Bulk generate */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 10 }}>Массовая генерация</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input type="number" min={1} max={50} value={count} onChange={e => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              style={{ width: 70, padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', textAlign: 'center', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 13, color: '#64748b' }}>паролей</span>
            <button onClick={generateBulk} style={{ flex: 1, padding: '8px 0', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, color: '#c4b5fd', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🎲 Сгенерировать</button>
            {bulk.length > 0 && <button onClick={() => copyText(bulk.join('\n'), 'bulk')} style={{ padding: '8px 14px', background: copied === 'bulk' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied === 'bulk' ? '#22c55e60' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, color: copied === 'bulk' ? '#86efac' : '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{copied === 'bulk' ? '✓' : '📋 Все'}</button>}
          </div>
          {bulk.length > 0 && (
            <div style={{ maxHeight: 140, overflowY: 'auto', background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
              {bulk.map((p, i) => (
                <div key={i} onClick={() => copyText(p, `bulk_${i}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #1e3a5f', cursor: 'pointer', gap: 8 }}>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: 12, color: '#a5b4fc', flex: 1 }}>{p}</span>
                  <span style={{ fontSize: 10, color: copied === `bulk_${i}` ? '#86efac' : '#334155', flexShrink: 0 }}>{copied === `bulk_${i}` ? '✓' : '📋'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 10 }}>История (последние 20)</div>
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {history.map((h, i) => (
                <div key={i} onClick={() => copyText(h.pwd, `hist_${i}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1e3a5f', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.pwd}</span>
                  <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{h.len}ч</span>
                  <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{h.time}</span>
                  <span style={{ fontSize: 11, color: copied === `hist_${i}` ? '#86efac' : '#334155', flexShrink: 0 }}>{copied === `hist_${i}` ? '✓' : '📋'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
