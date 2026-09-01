/**
 * Чайка ОС — QR-генератор
 * API: api.qrserver.com (free, no key)
 */
import React, { useState, useEffect } from 'react';

const SIZES = [100, 150, 200, 300, 400, 500];
const FORMATS = ['png', 'svg', 'gif'];
const PRESETS = [
  { label: 'URL сайта',      value: 'https://chaika-os.ru',  icon: '🌐' },
  { label: 'Чайка ОС',      value: 'https://chaika-os.onspace.build', icon: '🕊️' },
  { label: 'Визитная карта', value: 'BEGIN:VCARD\nFN:Иван Иванов\nTEL:+7-999-123-45-67\nEMAIL:ivan@chaika-os.ru\nEND:VCARD', icon: '📇' },
  { label: 'Wi-Fi',          value: 'WIFI:T:WPA;S:МойWiFi;P:password123;;', icon: '📶' },
  { label: 'Email',          value: 'mailto:ivan@chaika-os.ru', icon: '📧' },
  { label: 'SMS',            value: 'SMSTO:+7-999-000-00-00:Привет!', icon: '💬' },
  { label: 'Геолокация',     value: 'geo:55.7558,37.6176', icon: '📍' },
  { label: 'Телефон',        value: 'tel:+7-999-123-45-67', icon: '📞' },
];

export default function QRGenerator() {
  const [text, setText]       = useState('https://chaika-os.ru');
  const [size, setSize]       = useState(200);
  const [color, setColor]     = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin]   = useState(2);
  const [qrSrc, setQrSrc]     = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ text: string; src: string }[]>([]);

  const generateQR = () => {
    if (!text.trim()) return;
    const fg  = color.replace('#', '');
    const bg  = bgColor.replace('#', '');
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fg}&bgcolor=${bg}&margin=${margin}&ecc=M`;
    setQrSrc(src);
    setLoading(true);
    setHistory(h => [{ text: text.slice(0, 40), src }, ...h.slice(0, 9)]);
  };

  useEffect(() => { generateQR(); }, []);

  const downloadQR = (format: string) => {
    const fg  = color.replace('#', '');
    const bg  = bgColor.replace('#', '');
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fg}&bgcolor=${bg}&margin=${margin}&ecc=M&format=${format}`;
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `qr.${format}`;
    a.target  = '_blank';
    a.click();
  };

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden' }}>
      {/* Left — settings */}
      <div style={{ width: 280, background: '#0f172a', borderRight: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '12px 16px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>⊞ QR-генератор</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {/* Text input */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>СОДЕРЖИМОЕ</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              placeholder="URL, текст, контакт..."
              style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
          </div>

          {/* Presets */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ШАБЛОНЫ</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setText(p.value); }}
                  style={{ padding: '5px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f', borderRadius: 8, color: '#94a3b8', fontSize: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{p.icon}</span><span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>РАЗМЕР: {size}×{size}px</label>
            <input type="range" min={100} max={500} step={50} value={size} onChange={e => setSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {SIZES.map(s => (
                <button key={s} onClick={() => setSize(s)} style={{ padding: '2px 7px', background: size === s ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${size === s ? '#7c3aed60' : '#1e3a5f'}`, borderRadius: 5, color: size === s ? '#a78bfa' : '#475569', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>ЦВЕТ QR</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 30, borderRadius: 6, cursor: 'pointer', border: 'none', background: 'none' }} />
                <input value={color} onChange={e => setColor(e.target.value)} style={{ flex: 1, padding: '5px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'Consolas, monospace' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>ФОН</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 36, height: 30, borderRadius: 6, cursor: 'pointer', border: 'none', background: 'none' }} />
                <input value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ flex: 1, padding: '5px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'Consolas, monospace' }} />
              </div>
            </div>
          </div>

          {/* Margin */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 }}>ОТСТУП: {margin}</label>
            <input type="range" min={0} max={10} value={margin} onChange={e => setMargin(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
          </div>

          {/* Generate button */}
          <button onClick={generateQR} style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(124,58,237,0.4)', marginBottom: 10 }}>
            ⊞ Создать QR-код
          </button>

          {/* Download */}
          {qrSrc && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>СКАЧАТЬ</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {FORMATS.map(f => (
                  <button key={f} onClick={() => downloadQR(f)} style={{ flex: 1, padding: '6px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid #1e3a5f', borderRadius: 8, color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, textTransform: 'uppercase' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right — preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#020810', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {qrSrc ? (
            <div style={{ background: bgColor, padding: 16, borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', display: 'inline-block' }}>
              <img
                src={qrSrc}
                alt="QR Code"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                style={{ display: 'block', imageRendering: 'pixelated', maxWidth: Math.min(size, 400), maxHeight: Math.min(size, 400), width: '100%', height: 'auto' }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#334155' }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>⊞</div>
              <div>Введите текст и нажмите «Создать»</div>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: '#0f1929', borderTop: '1px solid #1e3a5f', padding: '10px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>ИСТОРИЯ</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {history.map((h, i) => (
                <div key={i} onClick={() => setQrSrc(h.src)} style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center' }}>
                  <img src={h.src} alt="" width={48} height={48} style={{ borderRadius: 6, border: '1px solid #1e3a5f', background: '#fff', display: 'block' }} />
                  <div style={{ fontSize: 9, color: '#334155', marginTop: 3, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
