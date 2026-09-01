import React, { useState, useRef } from 'react';

const BOOKMARKS = [
  { label: 'Яндекс',      url: 'https://yandex.ru',       icon: '🔴' },
  { label: 'ВКонтакте',   url: 'https://vk.com',          icon: '🔵' },
  { label: 'Госуслуги',   url: 'https://gosuslugi.ru',    icon: '🏛️' },
  { label: 'Wikipedia',   url: 'https://ru.wikipedia.org',icon: '📚' },
  { label: 'YouTube',     url: 'https://youtube.com',     icon: '▶️' },
  { label: 'Rutube',      url: 'https://rutube.ru',       icon: '📺' },
  { label: 'GitHub',      url: 'https://github.com',      icon: '🐙' },
];

export default function Browser() {
  const [inputUrl, setInputUrl] = useState('https://yandex.ru');
  const [currentUrl, setCurrentUrl] = useState('https://yandex.ru');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(['https://yandex.ru']);
  const [historyIdx, setHistoryIdx] = useState(0);

  const navigate = (target: string, addHistory = true) => {
    let finalUrl = target.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      // If looks like URL
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://yandex.ru/search/?text=' + encodeURIComponent(finalUrl);
      }
    }
    // Open in the user's real browser
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
    setCurrentUrl(finalUrl);
    setInputUrl(finalUrl);
    if (addHistory) {
      const newHist = [...history.slice(0, historyIdx + 1), finalUrl];
      setHistory(newHist);
      setHistoryIdx(newHist.length - 1);
    }
  };

  const goBack = () => {
    if (historyIdx > 0) {
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      setCurrentUrl(history[idx]);
      setInputUrl(history[idx]);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const idx = historyIdx + 1;
      setHistoryIdx(idx);
      setCurrentUrl(history[idx]);
      setInputUrl(history[idx]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') navigate(inputUrl);
  };

  const isSecure = currentUrl.startsWith('https://');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#202124', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      
      {/* Navigation bar */}
      <div style={{
        background: '#323639',
        borderBottom: '1px solid #1a1a1a',
        padding: '8px 10px',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        flexShrink: 0,
      }}>
        {/* Back/Forward/Refresh */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={goBack}
            disabled={historyIdx === 0}
            title="Назад"
            style={{ width: 32, height: 32, borderRadius: 50, background: 'none', border: 'none', cursor: historyIdx === 0 ? 'default' : 'pointer', color: historyIdx === 0 ? '#555' : '#e8eaed', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (historyIdx > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >←</button>
          <button
            onClick={goForward}
            disabled={historyIdx >= history.length - 1}
            title="Вперёд"
            style={{ width: 32, height: 32, borderRadius: 50, background: 'none', border: 'none', cursor: historyIdx >= history.length - 1 ? 'default' : 'pointer', color: historyIdx >= history.length - 1 ? '#555' : '#e8eaed', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (historyIdx < history.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >→</button>
        </div>

        {/* Address bar */}
        <div style={{
          flex: 1,
          display: 'flex',
          background: '#3c4043',
          border: '1px solid #5f6368',
          borderRadius: 20,
          overflow: 'hidden',
          alignItems: 'center',
          height: 34,
          paddingLeft: 12,
          paddingRight: 8,
          gap: 6,
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = '#8ab4f8')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = '#5f6368')}
        >
          <span style={{ fontSize: 13, color: isSecure ? '#81c995' : '#f28b82', flexShrink: 0 }}>
            {isSecure ? '🔒' : '⚠️'}
          </span>
          <input
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={e => e.target.select()}
            placeholder="Введите адрес или запрос..."
            style={{
              flex: 1, border: 'none', background: 'none', outline: 'none',
              color: '#e8eaed', fontSize: 13, fontFamily: 'Segoe UI, sans-serif',
              padding: 0,
            }}
          />
          <button
            onClick={() => navigate(inputUrl)}
            style={{ width: 26, height: 26, borderRadius: 50, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#8ab4f8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(138,180,248,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            title="Перейти (откроется в браузере)"
          >↗</button>
        </div>
      </div>

      {/* Bookmarks bar */}
      <div style={{
        background: '#292b2f',
        borderBottom: '1px solid #1a1a1a',
        padding: '4px 10px',
        display: 'flex',
        gap: 4,
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {BOOKMARKS.map(bm => (
          <button
            key={bm.label}
            onClick={() => navigate(bm.url)}
            style={{ background: 'none', border: '1px solid transparent', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#bdc1c6', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#e8eaed'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#bdc1c6'; }}
          >
            <span>{bm.icon}</span>
            <span>{bm.label}</span>
          </button>
        ))}
      </div>

      {/* Main content — new tab page */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#202124', padding: 32, overflowY: 'auto' }}>
        
        {/* Google-style search */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 52, fontWeight: 700, marginBottom: 24, letterSpacing: -1 }}>
            <span style={{ color: '#4285f4' }}>Ч</span>
            <span style={{ color: '#ea4335' }}>А</span>
            <span style={{ color: '#fbbc04' }}>Й</span>
            <span style={{ color: '#4285f4' }}>К</span>
            <span style={{ color: '#34a853' }}>А</span>
          </div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 600, margin: '0 auto', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', background: '#303134', border: '1px solid #5f6368', borderRadius: 24, alignItems: 'center', padding: '10px 18px', gap: 10 }}>
              <span style={{ color: '#9aa0a6', fontSize: 16 }}>🔍</span>
              <input
                placeholder="Поиск в интернете или введите URL..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8eaed', fontSize: 15, fontFamily: 'Segoe UI, sans-serif' }}
                onKeyDown={e => { if (e.key === 'Enter') navigate((e.target as HTMLInputElement).value); }}
              />
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div style={{
          background: 'rgba(66,133,244,0.1)',
          border: '1px solid rgba(66,133,244,0.3)',
          borderRadius: 12,
          padding: '16px 24px',
          maxWidth: 600,
          marginBottom: 40,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: '#8ab4f8', fontWeight: 600, marginBottom: 6 }}>
            🌐 Браузер Чайка ОС
          </div>
          <div style={{ fontSize: 13, color: '#9aa0a6', lineHeight: 1.6 }}>
            Все ссылки открываются в <strong style={{ color: '#e8eaed' }}>вашем браузере</strong> в новой вкладке.<br />
            Введите адрес или поисковый запрос выше и нажмите Enter.
          </div>
        </div>

        {/* Quick links grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 600, width: '100%' }}>
          {BOOKMARKS.map(bm => (
            <button
              key={bm.label}
              onClick={() => navigate(bm.url)}
              style={{
                background: '#303134',
                border: '1px solid #3c4043',
                borderRadius: 10,
                padding: '16px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
                color: '#bdc1c6',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3c4043'; e.currentTarget.style.borderColor = '#5f6368'; e.currentTarget.style.color = '#e8eaed'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#303134'; e.currentTarget.style.borderColor = '#3c4043'; e.currentTarget.style.color = '#bdc1c6'; }}
            >
              <span style={{ fontSize: 28 }}>{bm.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{bm.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: '#292b2f', borderTop: '1px solid #1a1a1a', padding: '3px 14px', fontSize: 11, color: '#9aa0a6', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>Готово · Ссылки открываются в браузере пользователя</span>
        <span style={{ color: '#8ab4f8' }}>Чайка Браузер</span>
      </div>
    </div>
  );
}
