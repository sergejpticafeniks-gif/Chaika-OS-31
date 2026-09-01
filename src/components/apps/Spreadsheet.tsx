import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SpreadsheetDoc {
  id: string;
  name: string;
  content: string;
  doc_type: string;
  updated_at: string;
  folder_id?: string | null;
}

interface CellData {
  value: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bg?: string;
  align?: 'left' | 'center' | 'right';
}

interface VfsFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

type GridData = Record<string, CellData>;

const COLS = 26;
const ROWS = 60;

function colLetter(i: number) { return String.fromCharCode(65 + i); }
function cellKey(r: number, c: number) { return `${colLetter(c)}${r + 1}`; }

function evaluateFormula(formula: string, grid: GridData): string {
  if (!formula.startsWith('=')) return formula;
  try {
    let expr = formula.slice(1).toUpperCase();
    expr = expr.replace(/SUM\(([A-Z]\d+):([A-Z]\d+)\)/g, (_m, from, to) => {
      const fc = from.charCodeAt(0) - 65, fr = parseInt(from.slice(1)) - 1;
      const tc = to.charCodeAt(0) - 65, tr = parseInt(to.slice(1)) - 1;
      let sum = 0;
      for (let r = fr; r <= tr; r++) for (let c = fc; c <= tc; c++) { const v = parseFloat(grid[cellKey(r, c)]?.value || '0'); if (!isNaN(v)) sum += v; }
      return String(sum);
    });
    expr = expr.replace(/AVG\(([A-Z]\d+):([A-Z]\d+)\)/g, (_m, from, to) => {
      const fc = from.charCodeAt(0) - 65, fr = parseInt(from.slice(1)) - 1;
      const tc = to.charCodeAt(0) - 65, tr = parseInt(to.slice(1)) - 1;
      let sum = 0, count = 0;
      for (let r = fr; r <= tr; r++) for (let c = fc; c <= tc; c++) { const v = parseFloat(grid[cellKey(r, c)]?.value || '0'); if (!isNaN(v)) { sum += v; count++; } }
      return count > 0 ? String((sum / count).toFixed(2)) : '0';
    });
    expr = expr.replace(/([A-Z]\d+)/g, (match) => { const v = grid[match]?.value || '0'; return isNaN(Number(v)) ? '0' : v; });
    const result = Function('"use strict"; return (' + expr + ')')();
    return String(result);
  } catch { return '#ERR'; }
}

export default function Spreadsheet() {
  const { user } = useAuth();
  const [grid, setGrid] = useState<GridData>({});
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [docName, setDocName] = useState('Новая таблица');
  const [currentDoc, setCurrentDoc] = useState<SpreadsheetDoc | null>(null);
  const [documents, setDocuments] = useState<SpreadsheetDoc[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveToDisk, setShowSaveToDisk] = useState(false);
  const [folders, setFolders] = useState<VfsFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_documents').select('*').eq('user_id', user.id).eq('doc_type', 'spreadsheet').order('updated_at', { ascending: false });
    setDocuments((data as SpreadsheetDoc[]) || []);
  }, [user]);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vfs_folders').select('*').eq('user_id', user.id).order('name');
    setFolders((data as VfsFolder[]) || []);
  }, [user]);

  useEffect(() => { loadDocuments(); loadFolders(); }, [loadDocuments, loadFolders]);

  const getCellDisplay = useCallback((r: number, c: number) => {
    const key = cellKey(r, c);
    const cell = grid[key];
    if (!cell?.value) return '';
    if (cell.value.startsWith('=')) return evaluateFormula(cell.value, grid);
    return cell.value;
  }, [grid]);

  const startEdit = (r: number, c: number) => {
    setSelected({ r, c });
    setEditValue(grid[cellKey(r, c)]?.value || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (!selected) return;
    const key = cellKey(selected.r, selected.c);
    setGrid(prev => ({ ...prev, [key]: { ...(prev[key] || {}), value: editValue } }));
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    if (e.key === 'Enter') { commitEdit(); setSelected(prev => prev ? { r: prev.r + 1, c: prev.c } : null); }
    else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); setSelected(prev => prev ? { r: prev.r, c: Math.min(prev.c + 1, COLS - 1) } : null); }
    else if (e.key === 'Escape') { setEditing(false); setEditValue(''); }
  };

  const setCellStyle = (prop: keyof CellData, value: any) => {
    if (!selected) return;
    const key = cellKey(selected.r, selected.c);
    setGrid(prev => ({ ...prev, [key]: { ...(prev[key] || { value: '' }), [prop]: value } }));
  };

  const saveDocument = async (folderId?: string | null) => {
    if (!user) return;
    setSaving(true);
    const content = JSON.stringify(grid);
    const folder = folderId !== undefined ? folderId : currentDoc?.folder_id ?? null;
    if (currentDoc) {
      await supabase.from('user_documents').update({ name: docName, content, updated_at: new Date().toISOString(), folder_id: folder }).eq('id', currentDoc.id);
      setCurrentDoc({ ...currentDoc, name: docName, content, folder_id: folder });
    } else {
      const { data } = await supabase.from('user_documents').insert({ user_id: user.id, name: docName, content, doc_type: 'spreadsheet', folder_id: folder }).select().single();
      if (data) setCurrentDoc(data as SpreadsheetDoc);
    }
    setSaving(false);
    setShowSaveToDisk(false);
    loadDocuments();
  };

  const exportToPDF = () => {
    const rows = ROWS, cols = COLS;
    let table = '<table border="1" style="border-collapse:collapse;font-size:10pt">';
    table += '<tr><th style="width:40px"></th>';
    for (let c = 0; c < cols; c++) table += `<th style="min-width:80px;background:#f0f0f0">${colLetter(c)}</th>`;
    table += '</tr>';
    for (let r = 0; r < rows; r++) {
      table += `<tr><td style="background:#f0f0f0;text-align:center;font-weight:bold">${r + 1}</td>`;
      for (let c = 0; c < cols; c++) {
        const d = getCellDisplay(r, c);
        if (!d) { table += '<td></td>'; continue; }
        const cell = grid[cellKey(r, c)];
        table += `<td style="padding:2px 4px;${cell?.bold ? 'font-weight:bold;' : ''}${cell?.italic ? 'font-style:italic;' : ''}${cell?.color ? `color:${cell.color};` : ''}${cell?.bg ? `background:${cell.bg};` : ''}text-align:${cell?.align || 'left'}">${d}</td>`;
      }
      table += '</tr>';
    }
    table += '</table>';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${docName}</title></head><body style="margin:10px"><h2>${docName}</h2>${table}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const openDocument = (doc: SpreadsheetDoc) => {
    setCurrentDoc(doc);
    setDocName(doc.name);
    try { setGrid(JSON.parse(doc.content)); } catch { setGrid({}); }
    setShowDocs(false);
  };

  const deleteDocument = async (id: string) => {
    await supabase.from('user_documents').delete().eq('id', id);
    if (currentDoc?.id === id) { setCurrentDoc(null); setDocName('Новая таблица'); setGrid({}); }
    loadDocuments();
  };

  const selectedKey = selected ? cellKey(selected.r, selected.c) : '';
  const selectedCell = selectedKey ? grid[selectedKey] : null;

  const folderTree = (parentId: string | null, depth: number): React.ReactNode => (
    folders.filter(f => f.parent_id === parentId).map(f => (
      <div key={f.id}>
        <div onClick={() => setSelectedFolderId(f.id)}
          style={{ padding: `4px 8px 4px ${14 + depth * 14}px`, cursor: 'pointer', fontSize: 12, borderRadius: 4, background: selectedFolderId === f.id ? '#22c55e' : 'transparent', color: selectedFolderId === f.id ? '#fff' : '#1a1a1a' }}>
          📁 {f.name}
        </div>
        {folderTree(f.id, depth + 1)}
      </div>
    ))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#e8e8e8', fontFamily: 'Segoe UI, sans-serif', userSelect: 'none' }}>
      {/* ── Ribbon ── */}
      <div style={{ background: 'linear-gradient(180deg, #1f7a3c 0%, #165c2d 100%)', padding: '0 8px', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, minHeight: 30 }}>
        {['Файл', 'Главная', 'Вставка', 'Данные', 'Вид', 'Справка'].map(m => (
          <button key={m} style={{ background: 'none', border: 'none', padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: 'rgba(255,255,255,0.85)', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          >{m}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Кострома ОС 28 · Excel</span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: 'linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%)', borderBottom: '1px solid #ccc', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={() => { setCurrentDoc(null); setDocName('Новая таблица'); setGrid({}); }} style={{ padding: '3px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>📊 Новый</button>
        <button onClick={() => setShowDocs(s => !s)} style={{ padding: '3px 10px', background: showDocs ? '#dcfce7' : '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>📁 Таблицы</button>
        <button onClick={() => saveDocument()} disabled={saving} style={{ padding: '3px 12px', background: saving ? '#94a3b8' : '#22c55e', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          {saving ? '⟳' : '💾 Сохранить'}
        </button>
        <button onClick={() => { loadFolders(); setShowSaveToDisk(s => !s); }} style={{ padding: '3px 12px', background: showSaveToDisk ? '#dcfce7' : '#fff', border: '1px solid #22c55e', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#166534', fontWeight: 600 }}>
          💽 На диск
        </button>
        <button onClick={exportToPDF} style={{ padding: '3px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📕 PDF</button>

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 4px' }} />

        {/* Cell formatting */}
        <button onClick={() => setCellStyle('bold', !selectedCell?.bold)} style={{ height: 26, padding: '0 8px', border: `1px solid ${selectedCell?.bold ? '#1f7a3c' : '#d1d5db'}`, borderRadius: 3, background: selectedCell?.bold ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: selectedCell?.bold ? '#166534' : '#374151' }}>Ж</button>
        <button onClick={() => setCellStyle('italic', !selectedCell?.italic)} style={{ height: 26, padding: '0 8px', border: `1px solid ${selectedCell?.italic ? '#1f7a3c' : '#d1d5db'}`, borderRadius: 3, background: selectedCell?.italic ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontStyle: 'italic', fontSize: 13, color: selectedCell?.italic ? '#166534' : '#374151' }}>К</button>

        {(['left', 'center', 'right'] as const).map((a, i) => (
          <button key={a} onClick={() => setCellStyle('align', a)} style={{ height: 26, padding: '0 6px', border: `1px solid ${selectedCell?.align === a ? '#1f7a3c' : '#d1d5db'}`, borderRadius: 3, background: selectedCell?.align === a ? '#dcfce7' : '#fafafa', cursor: 'pointer', fontSize: 11, color: selectedCell?.align === a ? '#166534' : '#374151' }}>
            {['≡', '≡', '≡'][i]}
          </button>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <label style={{ fontSize: 10, color: '#555' }}>Текст:</label>
          <input type="color" defaultValue="#000000" onChange={e => setCellStyle('color', e.target.value)} style={{ width: 22, height: 22, border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <label style={{ fontSize: 10, color: '#555' }}>Фон:</label>
          <input type="color" defaultValue="#ffffff" onChange={e => setCellStyle('bg', e.target.value)} style={{ width: 22, height: 22, border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: 0 }} />
        </div>

        <div style={{ flex: 1 }} />

        {selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, background: '#1f7a3c', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{selectedKey}</span>
            {editing ? (
              <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown}
                style={{ padding: '2px 8px', border: '1px solid #1f7a3c', borderRadius: 4, fontSize: 12, width: 220, outline: 'none' }}
                placeholder="Значение или =формула" autoFocus />
            ) : (
              <span style={{ fontSize: 12, color: '#374151', cursor: 'pointer' }} onClick={() => startEdit(selected.r, selected.c)}>{grid[selectedKey]?.value || ''}</span>
            )}
          </div>
        )}

        <input value={docName} onChange={e => setDocName(e.target.value)}
          style={{ padding: '3px 8px', border: '1px solid #22c55e', borderRadius: 4, fontSize: 11, width: 160, outline: 'none', background: '#f0fdf4', fontWeight: 600, color: '#166534' }}
          placeholder="Название таблицы" />
      </div>

      {/* ── Save to disk ── */}
      {showSaveToDisk && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderBottom: '1px solid #4ade80', padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>💽 Выберите папку</div>
            <div style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 8, maxHeight: 120, overflowY: 'auto', padding: 6 }}>
              <div onClick={() => setSelectedFolderId(null)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12, borderRadius: 4, background: selectedFolderId === null ? '#22c55e' : 'transparent', color: selectedFolderId === null ? '#fff' : '#1a1a1a' }}>
                🖥️ Корень
              </div>
              {folderTree(null, 0)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button onClick={() => saveDocument(selectedFolderId)} disabled={saving}
              style={{ padding: '8px 18px', background: saving ? '#94a3b8' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
              {saving ? '⟳' : '✓ Сохранить'}
            </button>
            <button onClick={() => setShowSaveToDisk(false)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Docs sidebar */}
        {showDocs && (
          <div style={{ width: 200, borderRight: '1px solid #bbb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '8px 12px', background: '#1f7a3c', color: '#fff', fontSize: 13, fontWeight: 700 }}>📊 Таблицы</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {documents.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Нет таблиц</div>
              ) : documents.map(doc => (
                <div key={doc.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 12px', cursor: 'pointer', background: currentDoc?.id === doc.id ? '#dcfce7' : 'none' }}
                  onClick={() => openDocument(doc)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>📊</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {new Date(doc.updated_at).toLocaleDateString('ru-RU')}
                        {doc.folder_id && <span style={{ marginLeft: 4, color: '#22c55e' }}>💽</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12, opacity: 0.6 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', background: '#fff' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: COLS * 100 + 50 }}>
            <thead>
              <tr>
                <th style={{ width: 50, height: 24, background: '#f0f0f0', border: '1px solid #d0d0d0', fontSize: 11, color: '#666', fontWeight: 500, position: 'sticky', top: 0, left: 0, zIndex: 3 }}></th>
                {Array.from({ length: COLS }, (_, c) => (
                  <th key={c} style={{ width: 100, height: 24, background: '#f0f0f0', border: '1px solid #d0d0d0', fontSize: 11, color: '#333', fontWeight: 700, textAlign: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
                    {colLetter(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <td style={{ width: 50, height: 22, background: '#f5f5f5', border: '1px solid #d8d8d8', fontSize: 11, color: '#555', fontWeight: 600, textAlign: 'center', position: 'sticky', left: 0, zIndex: 1 }}>
                    {r + 1}
                  </td>
                  {Array.from({ length: COLS }, (_, c) => {
                    const key = cellKey(r, c);
                    const isSelected = selected?.r === r && selected?.c === c;
                    const isEditingThis = editing && isSelected;
                    const cell = grid[key];
                    const display = getCellDisplay(r, c);
                    return (
                      <td key={c}
                        style={{
                          height: 22, border: isSelected ? '2px solid #1f7a3c' : '1px solid #e0e0e0',
                          background: isSelected ? '#ecfdf5' : (cell?.bg || '#fff'),
                          padding: 0, position: 'relative', overflow: 'hidden',
                        }}
                        onClick={() => { if (!isEditingThis) { setEditing(false); setSelected({ r, c }); } }}
                        onDoubleClick={() => startEdit(r, c)}
                      >
                        {isEditingThis ? (
                          <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleKeyDown}
                            style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 3px', fontSize: 12, background: 'transparent', fontWeight: cell?.bold ? 700 : 400, fontStyle: cell?.italic ? 'italic' : 'normal' }}
                            autoFocus />
                        ) : (
                          <span style={{
                            display: 'block', padding: '0 3px', fontSize: 12,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '22px',
                            textAlign: cell?.align || (isNaN(Number(display)) || display === '' ? 'left' : 'right'),
                            fontWeight: cell?.bold ? 700 : 400, fontStyle: cell?.italic ? 'italic' : 'normal',
                            color: cell?.color || '#000',
                          }}>
                            {display}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
