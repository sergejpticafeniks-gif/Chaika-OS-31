/**
 * Чайка ОС — Хеш-инструмент
 * SHA-1, SHA-256, SHA-512 via Web Crypto API
 * Base64 encode/decode, URL encode/decode
 */
import React, { useState, useCallback } from 'react';

async function hashString(input: string, algo: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

type Tool = 'hash' | 'base64' | 'url' | 'compare';

export default function HashTool() {
  const [tool, setTool] = useState<Tool>('hash');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [b64Input, setB64Input] = useState('');
  const [b64Output, setB64Output] = useState('');
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode');
  const [urlInput, setUrlInput] = useState('');
  const [urlOutput, setUrlOutput] = useState('');
  const [urlMode, setUrlMode] = useState<'encode' | 'decode'>('encode');
  const [compare1, setCompare1] = useState('');
  const [compare2, setCompare2] = useState('');
  const [compareResult, setCompareResult] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const ALGOS = [
    { id: 'SHA-1', label: 'SHA-1 (160 бит)' },
    { id: 'SHA-256', label: 'SHA-256 (256 бит) ✓' },
    { id: 'SHA-384', label: 'SHA-384 (384 бит)' },
    { id: 'SHA-512', label: 'SHA-512 (512 бит)' },
  ];

  const computeHashes = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res: Record<string, string> = {};
    for (const { id } of ALGOS) {
      res[id] = await hashString(input, id);
    }
    setResults(res);
    setLoading(false);
  }, [input]);

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleB64 = () => {
    if (b64Mode === 'encode') {
      setB64Output(btoa(unescape(encodeURIComponent(b64Input))));
    } else {
      try { setB64Output(decodeURIComponent(escape(atob(b64Input)))); }
      catch { setB64Output('⚠ Ошибка: невалидный Base64'); }
    }
  };

  const handleUrl = () => {
    if (urlMode === 'encode') setUrlOutput(encodeURIComponent(urlInput));
    else { try { setUrlOutput(decodeURIComponent(urlInput)); } catch { setUrlOutput('⚠ Ошибка декодирования'); } }
  };

  const handleCompare = async () => {
    if (!compare1 || !compare2) return;
    const h1 = await hashString(compare1, 'SHA-256');
    const h2 = await hashString(compare2, 'SHA-256');
    setCompareResult(h1 === h2);
  };

  const TABS: { id: Tool; label: string }[] = [
    { id: 'hash', label: '# Хеш' },
    { id: 'base64', label: '⊛ Base64' },
    { id: 'url', label: '🔗 URL' },
    { id: 'compare', label: '≡ Сравнить' },
  ];

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#0a1628',
    border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0',
    fontSize: 13, outline: 'none', fontFamily: 'Consolas, monospace',
    boxSizing: 'border-box', resize: 'none',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ padding: '12px 18px 0', fontSize: 17, fontWeight: 800, color: '#fbbf24' }}>🔒 Хеш-инструмент</div>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', borderBottom: tool === t.id ? '2px solid #fbbf24' : '2px solid transparent', color: tool === t.id ? '#fbbf24' : '#64748b', fontSize: 12, fontWeight: tool === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── HASH ── */}
        {tool === 'hash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ВХОДНОЙ ТЕКСТ</label>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={4} placeholder="Введите текст для хеширования..." style={inp as any} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={computeHashes} disabled={loading || !input.trim()} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#92400e,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? '⟳ Вычисление...' : '# Вычислить хеши'}
              </button>
              <button onClick={() => { setInput(''); setResults({}); }} style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #1e3a5f', borderRadius: 10, color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>

            {Object.entries(results).length > 0 && (
              <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, overflow: 'hidden' }}>
                {ALGOS.map(({ id, label }, i) => results[id] && (
                  <div key={id} style={{ padding: '12px 16px', borderBottom: i < ALGOS.length - 1 ? '1px solid #1e3a5f' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{label}</span>
                      <button onClick={() => copyVal(id, results[id])} style={{ padding: '3px 10px', background: copied === id ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied === id ? '#22c55e60' : '#1e3a5f'}`, borderRadius: 5, color: copied === id ? '#86efac' : '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {copied === id ? '✓' : '📋'}
                      </button>
                    </div>
                    <code style={{ fontSize: 12, color: '#fbbf24', fontFamily: 'Consolas, monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>{results[id]}</code>
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 12, padding: '12px 14px', fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
              <strong style={{ color: '#94a3b8' }}>ℹ О хешировании</strong><br />
              SHA-256 рекомендуется для большинства задач. SHA-1 устарел. Хеш — односторонняя функция: восстановить исходный текст из хеша невозможно.
            </div>
          </div>
        )}

        {/* ── BASE64 ── */}
        {tool === 'base64' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4, background: '#0f172a', borderRadius: 8, padding: 3 }}>
              {(['encode', 'decode'] as const).map(m => (
                <button key={m} onClick={() => setB64Mode(m)} style={{ flex: 1, padding: '8px', background: b64Mode === m ? '#1e293b' : 'none', border: 'none', borderRadius: 6, color: b64Mode === m ? '#fbbf24' : '#64748b', fontSize: 13, fontWeight: b64Mode === m ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m === 'encode' ? '→ Кодировать' : '← Декодировать'}
                </button>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ВХОДНОЙ ТЕКСТ</label>
              <textarea value={b64Input} onChange={e => setB64Input(e.target.value)} rows={4} placeholder={b64Mode === 'encode' ? 'Текст для кодирования...' : 'Base64 для декодирования...'} style={inp as any} />
            </div>
            <button onClick={handleB64} style={{ padding: '11px', background: 'linear-gradient(135deg,#92400e,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {b64Mode === 'encode' ? '→ Кодировать в Base64' : '← Декодировать из Base64'}
            </button>
            {b64Output && (
              <div style={{ background: '#0f1929', border: '1px solid #fbbf2440', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>РЕЗУЛЬТАТ</span>
                  <button onClick={() => copyVal('b64', b64Output)} style={{ padding: '3px 10px', background: 'none', border: '1px solid #1e3a5f', borderRadius: 5, color: '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied === 'b64' ? '✓ Скопировано' : '📋'}
                  </button>
                </div>
                <code style={{ fontSize: 13, color: '#fbbf24', fontFamily: 'Consolas, monospace', wordBreak: 'break-all', lineHeight: 1.6 }}>{b64Output}</code>
              </div>
            )}
          </div>
        )}

        {/* ── URL ── */}
        {tool === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4, background: '#0f172a', borderRadius: 8, padding: 3 }}>
              {(['encode', 'decode'] as const).map(m => (
                <button key={m} onClick={() => setUrlMode(m)} style={{ flex: 1, padding: '8px', background: urlMode === m ? '#1e293b' : 'none', border: 'none', borderRadius: 6, color: urlMode === m ? '#fbbf24' : '#64748b', fontSize: 13, fontWeight: urlMode === m ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m === 'encode' ? '→ URL-кодировать' : '← URL-декодировать'}
                </button>
              ))}
            </div>
            <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)} rows={4} placeholder="Введите текст или URL..." style={inp as any} />
            <button onClick={handleUrl} style={{ padding: '11px', background: 'linear-gradient(135deg,#92400e,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Преобразовать</button>
            {urlOutput && (
              <div style={{ background: '#0f1929', border: '1px solid #fbbf2440', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>РЕЗУЛЬТАТ</span>
                  <button onClick={() => copyVal('url', urlOutput)} style={{ padding: '3px 10px', background: 'none', border: '1px solid #1e3a5f', borderRadius: 5, color: '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied === 'url' ? '✓' : '📋'}
                  </button>
                </div>
                <code style={{ fontSize: 13, color: '#fbbf24', fontFamily: 'Consolas, monospace', wordBreak: 'break-all', lineHeight: 1.6 }}>{urlOutput}</code>
              </div>
            )}
          </div>
        )}

        {/* ── COMPARE ── */}
        {tool === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 4 }}>Сравните два текста или хеша (SHA-256)</div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ТЕКСТ/ХЕШ 1</label>
              <textarea value={compare1} onChange={e => setCompare1(e.target.value)} rows={3} style={inp as any} placeholder="Введите первый текст..." />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ТЕКСТ/ХЕШ 2</label>
              <textarea value={compare2} onChange={e => setCompare2(e.target.value)} rows={3} style={inp as any} placeholder="Введите второй текст..." />
            </div>
            <button onClick={handleCompare} style={{ padding: '11px', background: 'linear-gradient(135deg,#92400e,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ≡ Сравнить SHA-256
            </button>
            {compareResult !== null && (
              <div style={{ background: compareResult ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${compareResult ? '#22c55e60' : '#ef444460'}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{compareResult ? '✓' : '✗'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: compareResult ? '#86efac' : '#fca5a5' }}>
                  {compareResult ? 'Тексты совпадают' : 'Тексты различаются'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
