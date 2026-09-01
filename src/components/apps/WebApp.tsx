import React, { useState, useRef } from 'react';

interface WebAppProps {
  url: string;
  title: string;
  icon: string;
}

export default function WebApp({ url, title, icon }: WebAppProps) {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(k => k + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0f0' }}>
      {/* Minimal toolbar: only icon + title + refresh */}
      <div style={{
        background: 'linear-gradient(180deg, #f8f8f8, #e0e0e0)',
        borderBottom: '1px solid #bbb',
        padding: '4px 8px',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        height: 32,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Segoe UI, sans-serif' }}>{title}</span>
        <button
          onClick={handleRefresh}
          style={{
            background: 'linear-gradient(180deg,#fff,#ddd)',
            border: '1px solid #bbb', borderRadius: 3,
            padding: '2px 10px', cursor: 'pointer',
            fontSize: 14, color: '#333', height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
          title="Обновить"
        >↻</button>
      </div>

      {/* Loading bar */}
      {loading && (
        <div style={{ height: 3, background: '#e0e0e0', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: '40%',
            background: 'linear-gradient(90deg, transparent, #3399cc, transparent)',
            animation: 'webAppLoading 1.2s infinite linear',
          }} />
        </div>
      )}

      {/* IFrame */}
      <div style={{ flex: 1, position: 'relative', background: '#fff', overflow: 'hidden' }}>
        <iframe
          key={refreshKey}
          ref={iframeRef}
          src={url}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          onLoad={() => setLoading(false)}
          title={title}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
        {/* Overlay shown while loading to avoid flash */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
            <span style={{ fontSize: 48 }}>{icon}</span>
            <div style={{ fontSize: 14, color: '#666', fontFamily: 'Segoe UI, sans-serif' }}>Загрузка {title}...</div>
            <div style={{ width: 120, height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: '#3399cc', borderRadius: 2, animation: 'webAppLoading 1.2s infinite linear' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
