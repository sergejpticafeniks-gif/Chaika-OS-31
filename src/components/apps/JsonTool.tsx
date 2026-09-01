/**
 * Чайка ОС — JSON-инструмент
 * Форматирование, минификация, валидация, поиск
 */
import React, { useState, useCallback } from 'react';

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'color:#b5cea8'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'color:#9cdcfe;font-weight:600'; // key
        else cls = 'color:#ce9178'; // string
      } else if (/true|false/.test(match)) {
        cls = 'color:#4fc1ff';
      } else if (/null/.test(match)) {
        cls = 'color:#569cd6';
      }
      return `<span style="${cls}">${match}</span>`;
    });
}

const SAMPLES = {
  Пользователь: JSON.stringify({
    id: "uuid-1234", username: "ivanov", email: "ivanov@chaika-os.ru",
    profile: { first_name: "Иван", last_name: "Иванов", city: "Москва", is_admin: false },
    created_at: new Date().toISOString(),
  }, null, 2),
  Приложение: JSON.stringify({
    name: "hello-chaika", version: "1.0.0", target: "chaika-os",
    permissions: ["user:id","user:profile","desktop:notifications"],
    components: [{ type: "button", label: "Нажми меня", x: 50, y: 50 }]
  }, null, 2),
  'API-ответ': JSON.stringify({
    status: "ok", code: 200,
    data: { items: [1,2,3], total: 3, page: 1, pages: 1 },
    meta: { version: "v1", ts: Date.now() }
  }, null, 2),
};

export default function JsonTool() {
  const [input, setInput]   = useState(SAMPLES['Пользователь']);
  const [output, setOutput] = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab]       = useState<'input' | 'formatted' | 'tree'>('input');
  const [indent, setIndent] = useState(2);
  const [stats, setStats]   = useState<{ keys: number; depth: number; size: number } | null>(null);

  const countKeys = (obj: any, depth = 0): [number, number] => {
    if (typeof obj !== 'object' || obj === null) return [0, depth];
    const entries = Object.values(obj);
    let keys = Object.keys(obj).length, maxD = depth;
    for (const v of entries) {
      const [k, d] = countKeys(v, depth + 1);
      keys += k; maxD = Math.max(maxD, d);
    }
    return [keys, maxD];
  };

  const formatJson = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      const fmt    = JSON.stringify(parsed, null, indent);
      setOutput(fmt);
      const [keys, depth] = countKeys(parsed);
      setStats({ keys, depth, size: new Blob([input]).size });
      setTab('formatted');
    } catch (e: any) {
      setError(`JSON Error: ${e.message}`);
    }
  }, [input, indent]);

  const minifyJson = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setTab('formatted');
    } catch (e: any) {
      setError(`JSON Error: ${e.message}`);
    }
  }, [input]);

  const validateJson = useCallback(() => {
    try {
      JSON.parse(input);
      setError(null);
      alert('✅ JSON валиден!');
    } catch (e: any) {
      setError(`❌ Невалидный JSON: ${e.message}`);
    }
  }, [input]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = output ? syntaxHighlight(output) : '';

  const renderTree = (obj: any, depth = 0): React.ReactNode => {
    if (obj === null) return <span style={{ color: '#569cd6' }}>null</span>;
    if (typeof obj === 'boolean') return <span style={{ color: '#4fc1ff' }}>{String(obj)}</span>;
    if (typeof obj === 'number') return <span style={{ color: '#b5cea8' }}>{obj}</span>;
    if (typeof obj === 'string') return <span style={{ color: '#ce9178' }}>"{obj}"</span>;
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span style={{ color: '#d4d4d4' }}>[]</span>;
      return (
        <details open={depth < 2}>
          <summary style={{ color: '#d4d4d4', cursor: 'pointer' }}>[{obj.length}]</summary>
          <div style={{ paddingLeft: 20, borderLeft: '1px solid #1e3a5f', marginLeft: 8 }}>
            {obj.map((v, i) => <div key={i}><span style={{ color: '#6a9955' }}>{i}: </span>{renderTree(v, depth + 1)}</div>)}
          </div>
        </details>
      );
    }
    const entries = Object.entries(obj);
    if (entries.length === 0) return <span style={{ color: '#d4d4d4' }}>{'{}'}</span>;
    return (
      <details open={depth < 2}>
        <summary style={{ color: '#d4d4d4', cursor: 'pointer' }}>{'{}'} {entries.length} ключей</summary>
        <div style={{ paddingLeft: 20, borderLeft: '1px solid #1e3a5f', marginLeft: 8 }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ margin: '2px 0' }}>
              <span style={{ color: '#9cdcfe', fontWeight: 600 }}>"{k}"</span>
              <span style={{ color: '#d4d4d4' }}>: </span>
              {renderTree(v, depth + 1)}
            </div>
          ))}
        </div>
      </details>
    );
  };

  let parsedForTree: any = null;
  try { parsedForTree = JSON.parse(input); } catch {}

  const filteredOutput = search
    ? (output || input).split('\n').filter(line => line.toLowerCase().includes(search.toLowerCase())).join('\n')
    : (output || input);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '8px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24', marginRight: 4 }}>{'{ }'} JSON</span>
        <button onClick={formatJson} style={{ padding: '5px 12px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7, color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🎨 Форматировать</button>
        <button onClick={minifyJson} style={{ padding: '5px 12px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#fbbf24', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>⚡ Минификация</button>
        <button onClick={validateJson} style={{ padding: '5px 12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 7, color: '#86efac', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✓ Валидировать</button>
        <select onChange={e => setInput(SAMPLES[e.target.value as keyof typeof SAMPLES] || '')} style={{ padding: '5px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, color: '#94a3b8', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="">Примеры...</option>
          {Object.keys(SAMPLES).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
          Отступ:
          <select value={indent} onChange={e => setIndent(parseInt(e.target.value))} style={{ padding: '3px 6px', background: '#0f172a', border: '1px solid #334155', borderRadius: 5, color: '#94a3b8', fontSize: 11, outline: 'none', fontFamily: 'inherit' }}>
            {[2,4,8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {stats && <div style={{ fontSize: 10, color: '#475569' }}>{stats.keys} ключей · глубина {stats.depth} · {(stats.size / 1024).toFixed(1)} КБ</div>}
        <button onClick={copyOutput} style={{ padding: '5px 12px', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? '#22c55e60' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, color: copied ? '#86efac' : '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          {copied ? '✓ Скопировано' : '📋 Копировать'}
        </button>
      </div>

      {/* Error */}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.3)', padding: '8px 16px', fontSize: 12, color: '#fca5a5', flexShrink: 0 }}>{error}</div>}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e3a5f' }}>
          <div style={{ background: '#0a1628', padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#475569', flexShrink: 0 }}>ВВОД</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            spellCheck={false}
            placeholder='{"key": "value"}'
            style={{ flex: 1, background: '#0f172a', color: '#d4d4d4', border: 'none', outline: 'none', resize: 'none', padding: '12px 16px', fontFamily: 'Consolas, monospace', fontSize: 13, lineHeight: 1.7, overflowY: 'auto', whiteSpace: 'pre', overflowX: 'auto' }}
          />
        </div>

        {/* Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#0a1628', padding: '4px 10px', display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            {(['formatted', 'tree'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '3px 10px', background: tab === t ? '#1565c0' : 'none', border: tab === t ? 'none' : '1px solid #1e3a5f', borderRadius: 6, color: tab === t ? '#fff' : '#475569', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                {t === 'formatted' ? 'ВЫВОД' : '🌳 ДЕРЕВО'}
              </button>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." style={{ marginLeft: 6, padding: '3px 8px', background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 6, color: '#94a3b8', fontSize: 10, outline: 'none', fontFamily: 'inherit', width: 100 }} />
          </div>

          {tab === 'formatted' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#0f172a' }}>
              {highlighted ? (
                <pre style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  dangerouslySetInnerHTML={{ __html: highlighted }} />
              ) : (
                <div style={{ color: '#334155', fontSize: 13, padding: '20px 0' }}>Нажмите «Форматировать» для вывода</div>
              )}
            </div>
          )}

          {tab === 'tree' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#0f172a', fontFamily: 'Consolas, monospace', fontSize: 12, lineHeight: 1.8 }}>
              {parsedForTree !== null ? renderTree(parsedForTree) : (
                <div style={{ color: '#ef4444', fontSize: 12 }}>Невалидный JSON — исправьте ошибки во вводе</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
