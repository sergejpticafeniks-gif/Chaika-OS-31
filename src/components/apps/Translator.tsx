/**
 * Чайка ОС — Переводчик
 * MyMemory API (free, no key)
 */
import React, { useState, useCallback } from 'react';

const LANGUAGES: Record<string, string> = {
  ru: '🇷🇺 Русский',    en: '🇺🇸 Английский', de: '🇩🇪 Немецкий',
  fr: '🇫🇷 Французский', es: '🇪🇸 Испанский',  it: '🇮🇹 Итальянский',
  zh: '🇨🇳 Китайский',  ja: '🇯🇵 Японский',   ko: '🇰🇷 Корейский',
  ar: '🇸🇦 Арабский',   tr: '🇹🇷 Турецкий',   pt: '🇧🇷 Португальский',
  pl: '🇵🇱 Польский',   uk: '🇺🇦 Украинский',  kz: '🇰🇿 Казахский',
  be: '🇧🇾 Белорусский', hi: '🇮🇳 Хинди',       nl: '🇳🇱 Нидерландский',
};

const POPULAR_PAIRS = [
  { from: 'ru', to: 'en', text: 'Привет, мир!' },
  { from: 'en', to: 'ru', text: 'Hello, World!' },
  { from: 'ru', to: 'zh', text: 'Доброе утро' },
  { from: 'ru', to: 'de', text: 'Как дела?' },
];

export default function Translator() {
  const [from, setFrom]         = useState('ru');
  const [to, setTo]             = useState('en');
  const [input, setInput]       = useState('');
  const [result, setResult]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [history, setHistory]   = useState<{ from: string; to: string; src: string; dst: string }[]>([]);
  const [copied, setCopied]     = useState(false);

  const translate = useCallback(async (text?: string, fromLang?: string, toLang?: string) => {
    const src   = (text  ?? input).trim();
    const srcLang = fromLang ?? from;
    const dstLang = toLang   ?? to;
    if (!src) return;

    setLoading(true);
    setError(null);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(src)}&langpair=${srcLang}|${dstLang}&de=chaika@chaika-os.ru`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();

      if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Translation failed');

      const translated = data.responseData?.translatedText ?? '';
      setResult(translated);
      setHistory(h => [{ from: srcLang, to: dstLang, src, dst: translated }, ...h.slice(0, 19)]);
    } catch (e: any) {
      setError(e.message.includes('abort') ? 'Превышено время ожидания. Попробуйте снова.' : `Ошибка: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, from, to]);

  const swap = () => {
    const newFrom = to, newTo = from;
    setFrom(newFrom);
    setTo(newTo);
    if (result) { setInput(result); setResult(''); }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selStyle: React.CSSProperties = {
    flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #334155',
    borderRadius: 10, color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '12px 18px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#60a5fa' }}>🌐 Переводчик Чайка</div>
        <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>MyMemory API · без регистрации</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Language selectors */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={from} onChange={e => setFrom(e.target.value)} style={selStyle}>
            {Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <button onClick={swap} style={{ padding: '8px 14px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, color: '#60a5fa', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>⇄</button>
          <select value={to} onChange={e => setTo(e.target.value)} style={selStyle}>
            {Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </div>

        {/* Input */}
        <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, overflow: 'hidden' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) translate(); }}
            placeholder="Введите текст для перевода... (Ctrl+Enter для перевода)"
            rows={5}
            style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#e2e8f0', fontSize: 15, lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e3a5f' }}>
            <span style={{ fontSize: 11, color: '#334155' }}>{input.length} символов</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setInput(''); setResult(''); }} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e3a5f', borderRadius: 7, color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Очистить</button>
              <button onClick={() => translate()} disabled={loading || !input.trim()} style={{ padding: '5px 18px', background: loading ? '#334155' : 'linear-gradient(135deg,#1565c0,#1d4ed8)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                {loading ? '⟳ Перевод...' : '→ Перевести'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fca5a5' }}>{error}</div>}

        {/* Result */}
        {result && (
          <div style={{ background: '#0f1929', border: '1px solid #22c55e40', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: 'rgba(34,197,94,0.06)', padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #22c55e30' }}>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>✓ Перевод</span>
              <button onClick={copy} style={{ padding: '3px 10px', background: copied ? 'rgba(34,197,94,0.15)' : 'transparent', border: `1px solid ${copied ? '#22c55e' : 'transparent'}`, borderRadius: 5, color: copied ? '#86efac' : '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {copied ? '✓ Скопировано' : '📋'}
              </button>
            </div>
            <div style={{ padding: '14px 16px', fontSize: 15, lineHeight: 1.7, color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>{result}</div>
          </div>
        )}

        {/* Quick examples */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Быстрые примеры</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {POPULAR_PAIRS.map((p, i) => (
              <button key={i} onClick={() => { setFrom(p.from); setTo(p.to); setInput(p.text); setTimeout(() => translate(p.text, p.from, p.to), 50); }}
                style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f', borderRadius: 8, color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {LANGUAGES[p.from].split(' ')[0]} → {LANGUAGES[p.to].split(' ')[0]}: «{p.text}»
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 10 }}>История переводов</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((h, i) => (
                <div key={i} onClick={() => { setFrom(h.from); setTo(h.to); setInput(h.src); setResult(h.dst); }}
                  style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e3a5f', borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a5f'}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>{LANGUAGES[h.from]?.split(' ')[0]} → {LANGUAGES[h.to]?.split(' ')[0]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{h.src}</div>
                  <div style={{ fontSize: 12, color: '#60a5fa', marginTop: 3 }}>{h.dst}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
