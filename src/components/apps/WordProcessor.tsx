import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  id: string;
  name: string;
  content: string;
  doc_type: string;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
}

interface VfsFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

export default function WordProcessor() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [docName, setDocName] = useState('Новый документ');
  const [saving, setSaving] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showSaveToDisk, setShowSaveToDisk] = useState(false);
  const [folders, setFolders] = useState<VfsFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [textColor, setTextColor] = useState('#000000');
  const [lineHeight, setLineHeight] = useState(1.6);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_documents').select('*').eq('user_id', user.id).eq('doc_type', 'document').order('updated_at', { ascending: false });
    setDocuments((data as Document[]) || []);
  }, [user]);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vfs_folders').select('*').eq('user_id', user.id).order('name');
    setFolders((data as VfsFolder[]) || []);
  }, [user]);

  useEffect(() => { loadDocuments(); loadFolders(); }, [loadDocuments, loadFolders]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const saveDocument = async (folderId?: string | null) => {
    if (!user) return;
    const html = editorRef.current?.innerHTML || '';
    setSaving(true);
    const folder = folderId !== undefined ? folderId : currentDoc?.folder_id ?? null;
    if (currentDoc) {
      await supabase.from('user_documents').update({ name: docName, content: html, updated_at: new Date().toISOString(), folder_id: folder }).eq('id', currentDoc.id);
      setCurrentDoc({ ...currentDoc, name: docName, content: html, folder_id: folder });
    } else {
      const { data } = await supabase.from('user_documents').insert({ user_id: user.id, name: docName, content: html, doc_type: 'document', folder_id: folder }).select().single();
      if (data) setCurrentDoc(data as Document);
    }
    setSaving(false);
    setShowSaveToDisk(false);
    loadDocuments();
  };

  const exportToPDF = () => {
    const html = editorRef.current?.innerHTML || '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="UTF-8">
        <title>${docName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 14pt; margin: 2cm; line-height: 1.6; color: #000; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${html}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  const openDocument = (doc: Document) => {
    setCurrentDoc(doc);
    setDocName(doc.name);
    if (editorRef.current) editorRef.current.innerHTML = doc.content;
    setShowDocs(false);
  };

  const newDocument = () => {
    setCurrentDoc(null);
    setDocName('Новый документ');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const deleteDocument = async (id: string) => {
    await supabase.from('user_documents').delete().eq('id', id);
    if (currentDoc?.id === id) newDocument();
    loadDocuments();
  };

  const scheduleAutoSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => saveDocument(), 4000);
  };

  const toolBtn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button key={label} onClick={onClick} title={title}
      style={{
        padding: '0 8px', border: active ? '1px solid #3b82f6' : '1px solid #d1d5db',
        borderRadius: 3, background: active ? '#dbeafe' : '#fafafa', cursor: 'pointer',
        fontSize: label.length > 2 ? 10 : 13, fontWeight: active ? 700 : 400,
        color: active ? '#1d4ed8' : '#374151', height: 26, minWidth: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s',
      }}>{label}</button>
  );

  const folderTree = (parentId: string | null, depth: number): React.ReactNode => (
    folders.filter(f => f.parent_id === parentId).map(f => (
      <div key={f.id}>
        <div
          onClick={() => setSelectedFolderId(f.id)}
          style={{
            padding: `5px 8px 5px ${16 + depth * 14}px`, cursor: 'pointer', fontSize: 12,
            background: selectedFolderId === f.id ? '#3b82f6' : 'transparent',
            color: selectedFolderId === f.id ? '#fff' : '#1a1a1a', borderRadius: 4,
          }}>📁 {f.name}
        </div>
        {folderTree(f.id, depth + 1)}
      </div>
    ))
  );

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#e8e8e8', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* ── Ribbon / Menu bar ── */}
      <div style={{ background: 'linear-gradient(180deg, #2b579a 0%, #1f4080 100%)', padding: '0 8px', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, minHeight: 30 }}>
        {['Файл', 'Главная', 'Вставка', 'Разметка', 'Вид', 'Справка'].map(m => (
          <button key={m} style={{ background: 'none', border: 'none', padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: 'rgba(255,255,255,0.85)', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          >{m}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Кострома ОС 28 · Word</span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: 'linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%)', borderBottom: '1px solid #ccc', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
        {/* Actions */}
        <button onClick={newDocument} title="Новый" style={{ padding: '3px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          📄 Новый
        </button>
        <button onClick={() => setShowDocs(s => !s)} title="Документы" style={{ padding: '3px 10px', background: showDocs ? '#dbeafe' : '#fff', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
          📁 Мои документы
        </button>
        <button onClick={() => saveDocument()} disabled={saving} title="Сохранить" style={{ padding: '3px 12px', background: saving ? '#94a3b8' : '#22c55e', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          {saving ? '⟳' : '💾 Сохранить'}
        </button>
        <button onClick={() => { loadFolders(); setShowSaveToDisk(s => !s); }} title="Сохранить на виртуальный диск"
          style={{ padding: '3px 12px', background: showSaveToDisk ? '#dbeafe' : '#fff', border: '1px solid #3b82f6', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>
          💽 На диск
        </button>
        <button onClick={exportToPDF} title="Экспорт в PDF" style={{ padding: '3px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          📕 PDF
        </button>

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 4px' }} />

        {/* Font */}
        <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); execCmd('fontName', e.target.value); }} style={{ height: 26, border: '1px solid #ccc', borderRadius: 3, fontSize: 11, padding: '0 4px', background: '#fff', minWidth: 120 }}>
          {['Times New Roman', 'Arial', 'Calibri', 'Verdana', 'Courier New', 'Georgia', 'Trebuchet MS', 'Segoe UI'].map(f => <option key={f}>{f}</option>)}
        </select>

        <select value={fontSize} onChange={e => { setFontSize(Number(e.target.value)); if (editorRef.current) editorRef.current.style.fontSize = e.target.value + 'px'; }} style={{ height: 26, border: '1px solid #ccc', borderRadius: 3, fontSize: 11, padding: '0 4px', width: 50, background: '#fff' }}>
          {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map(s => <option key={s}>{s}</option>)}
        </select>

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 2px' }} />

        {toolBtn(isBold,       () => { setIsBold(b => !b); execCmd('bold'); }, 'Ж', 'Жирный')}
        {toolBtn(isItalic,     () => { setIsItalic(i => !i); execCmd('italic'); }, 'К', 'Курсив')}
        {toolBtn(isUnderline,  () => { setIsUnderline(u => !u); execCmd('underline'); }, 'Ч̲', 'Подчёркнутый')}
        <button onClick={() => execCmd('strikeThrough')} style={{ padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 3, background: '#fafafa', cursor: 'pointer', height: 26, minWidth: 26, fontSize: 11 }} title="Зачёркнутый"><s>З</s></button>

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 2px' }} />

        {(['left', 'center', 'right', 'justify'] as const).map((align, idx) => (
          toolBtn(textAlign === align, () => { setTextAlign(align); execCmd('justify' + align.charAt(0).toUpperCase() + align.slice(1)); },
            ['≡', '≡', '≡', '≡'][idx],
            `По ${['левому краю', 'центру', 'правому краю', 'ширине'][idx]}`)
        ))}

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 2px' }} />

        <button onClick={() => execCmd('insertUnorderedList')} style={{ height: 26, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 3, background: '#fafafa', cursor: 'pointer', fontSize: 11 }}>• Список</button>
        <button onClick={() => execCmd('insertOrderedList')} style={{ height: 26, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 3, background: '#fafafa', cursor: 'pointer', fontSize: 11 }}>1. Нумер.</button>
        <button onClick={() => execCmd('indent')} style={{ height: 26, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 3, background: '#fafafa', cursor: 'pointer', fontSize: 11 }}>→ Отступ</button>
        <button onClick={() => execCmd('insertHorizontalRule')} style={{ height: 26, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 3, background: '#fafafa', cursor: 'pointer', fontSize: 11 }}>― Линия</button>

        <div style={{ width: 1, height: 22, background: '#ccc', margin: '0 2px' }} />

        {/* Color + line height */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={{ fontSize: 10, color: '#555' }}>Цвет:</label>
          <input type="color" value={textColor} onChange={e => { setTextColor(e.target.value); execCmd('foreColor', e.target.value); }} style={{ width: 24, height: 24, border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: 0 }} />
        </div>

        <div style={{ flex: 1 }} />

        <input value={docName} onChange={e => setDocName(e.target.value)}
          style={{ padding: '3px 8px', border: '1px solid #3b82f6', borderRadius: 4, fontSize: 11, width: 180, outline: 'none', background: '#eff6ff', fontWeight: 600, color: '#1e40af' }}
          placeholder="Название документа" />
      </div>

      {/* ── Save to disk panel ── */}
      {showSaveToDisk && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderBottom: '1px solid #93c5fd', padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>💽 Выберите папку на виртуальном диске</div>
            <div style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8, maxHeight: 130, overflowY: 'auto', padding: 6 }}>
              <div onClick={() => setSelectedFolderId(null)}
                style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12, borderRadius: 4, background: selectedFolderId === null ? '#3b82f6' : 'transparent', color: selectedFolderId === null ? '#fff' : '#1a1a1a', marginBottom: 2 }}>
                🖥️ Мой компьютер (корень)
              </div>
              {folderTree(null, 0)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button onClick={() => saveDocument(selectedFolderId)} disabled={saving}
              style={{ padding: '8px 18px', background: saving ? '#94a3b8' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
              {saving ? '⟳' : '✓ Сохранить'}
            </button>
            <button onClick={() => setShowSaveToDisk(false)}
              style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#374151' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Documents sidebar */}
        {showDocs && (
          <div style={{ width: 220, borderRight: '1px solid #bbb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '8px 12px', background: '#2b579a', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📁</span> Документы
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {documents.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Нет документов</div>
              ) : documents.map(doc => (
                <div key={doc.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 12px', cursor: 'pointer', background: currentDoc?.id === doc.id ? '#dbeafe' : 'none', transition: 'background 0.1s' }}
                  onClick={() => openDocument(doc)}
                  onMouseEnter={e => { if (currentDoc?.id !== doc.id) e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={e => { if (currentDoc?.id !== doc.id) e.currentTarget.style.background = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {new Date(doc.updated_at).toLocaleDateString('ru-RU')}
                        {doc.folder_id && <span style={{ marginLeft: 4, color: '#3b82f6' }}>💽</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 2, opacity: 0.6 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Page area */}
        <div style={{ flex: 1, overflow: 'auto', background: '#808080', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ background: '#fff', width: 794, minHeight: 1123, boxShadow: '0 6px 24px rgba(0,0,0,0.4)', padding: '100px 96px 96px', boxSizing: 'border-box', position: 'relative' }}>
            {/* Top ruler */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 22, background: '#e8e8e8', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', paddingLeft: 96 }}>
              {Array.from({ length: 17 }, (_, i) => (
                <div key={i} style={{ flex: i === 0 || i === 16 ? 'none' : 1, position: 'relative', minWidth: 0 }}>
                  {i > 0 && i < 17 && <>
                    <div style={{ position: 'absolute', left: 0, top: 2, height: i % 5 === 0 ? 12 : 7, width: 1, background: '#666' }} />
                    {i % 5 === 0 && <span style={{ position: 'absolute', left: 3, top: 5, fontSize: 8, color: '#555' }}>{i}</span>}
                  </>}
                </div>
              ))}
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={scheduleAutoSave}
              style={{
                outline: 'none', minHeight: 900, fontSize: fontSize + 'px',
                fontFamily, lineHeight: lineHeight, color: '#000', textAlign,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
