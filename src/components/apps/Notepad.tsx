import React, { useState } from 'react';

export default function Notepad() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('Без имени.txt');
  const [saved, setSaved] = useState(true);

  const handleSave = () => {
    localStorage.setItem(`notepad_${fileName}`, text);
    setSaved(true);
  };

  const handleNew = () => {
    setText('');
    setFileName('Без имени.txt');
    setSaved(true);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Menu bar */}
      <div style={{ display: 'flex', gap: 0, background: '#f0f0f0', borderBottom: '1px solid #ccc', padding: '2px 4px', fontSize: 13 }}>
        {['Файл', 'Правка', 'Формат', 'Вид', 'Справка'].map(menu => (
          <button key={menu} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', fontSize: 13, color: '#000' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#d0d0d0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {menu}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, background: '#f5f5f5', borderBottom: '1px solid #ddd', padding: '4px 8px' }}>
        <button className="notepad-toolbar-btn" onClick={handleNew} title="Новый">📄 Новый</button>
        <button className="notepad-toolbar-btn" onClick={handleSave} title="Сохранить">💾 Сохранить</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>
          {!saved && '● '}{fileName}
        </span>
      </div>

      {/* Editor */}
      <textarea
        style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none',
          padding: '8px 12px', fontFamily: 'Consolas, monospace', fontSize: 14,
          lineHeight: 1.6, background: '#fff', color: '#000', userSelect: 'text',
        }}
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        placeholder="Начните печатать..."
        spellCheck={false}
      />

      {/* Status bar */}
      <div style={{ display: 'flex', gap: 16, padding: '3px 12px', background: '#f0f0f0', borderTop: '1px solid #ccc', fontSize: 12, color: '#666' }}>
        <span>Строка 1, Столбец 1</span>
        <span>Символов: {charCount}</span>
        <span>Слов: {wordCount}</span>
        <span style={{ marginLeft: 'auto' }}>Windows (CRLF)</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
