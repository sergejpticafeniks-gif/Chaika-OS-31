import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDesktopFiles } from '@/hooks/useDesktopFiles';

// PNG icons
import icFolderOpen from '@/assets/icons/folder-open.png';
import icFolderNew  from '@/assets/icons/folder-new.png';
import icFileImg    from '@/assets/icons/file-image.png';
import icFileTxt    from '@/assets/icons/file-text.png';
import icFileGen    from '@/assets/icons/file-generic.png';
import icNavBack    from '@/assets/icons/nav-back.png';
import icNavUp      from '@/assets/icons/nav-up.png';

interface VfsFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface DesktopFile {
  id: string;
  name: string;
  original_name: string;
  file_url: string | null;
  file_type: string;
  file_size: number;
  folder_id: string | null;
  created_at: string;
}

type DragPayload =
  | { kind: 'folder'; id: string }
  | { kind: 'file';   id: string };

function fileIcon(type: string): string {
  if (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp'].some(e => type.includes(e))) return icFileImg;
  if (type === 'text' || type.startsWith('text/')) return icFileTxt;
  return icFileGen;
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU');
}

// ── Tree node component ────────────────────────────
function FolderNode({
  folder, allFolders, depth, selectedId, onSelect, dragOver, onDragOver, onDrop,
}: {
  folder: VfsFolder;
  allFolders: VfsFolder[];
  depth: number;
  selectedId: string | null;
  onSelect: (f: VfsFolder) => void;
  dragOver: string | null;
  onDragOver: (id: string | null) => void;
  onDrop: (targetId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = allFolders.filter(f => f.parent_id === folder.id);
  const isSelected = selectedId === folder.id;
  const isDragOver = dragOver === folder.id;

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: `3px 4px 3px ${8 + depth * 14}px`,
          cursor: 'pointer', fontSize: 12, userSelect: 'none',
          background: isSelected ? '#3b82f6' : isDragOver ? 'rgba(59,130,246,0.2)' : 'transparent',
          color: isSelected ? '#fff' : '#1a1a1a',
          borderRadius: 3,
        }}
        onClick={() => { onSelect(folder); if (children.length) setExpanded(e => !e); }}
        onDragOver={e => { e.preventDefault(); onDragOver(folder.id); }}
        onDragLeave={() => onDragOver(null)}
        onDrop={e => { e.preventDefault(); onDrop(folder.id); onDragOver(null); }}
      >
        {children.length > 0 ? (
          <span style={{ fontSize: 8, width: 10, flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
        ) : <span style={{ width: 10 }} />}
        <img src={icFolderOpen} width={16} height={16} style={{ display: 'block', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
      </div>
      {expanded && children.map(c => (
        <FolderNode key={c.id} folder={c} allFolders={allFolders} depth={depth + 1}
          selectedId={selectedId} onSelect={onSelect}
          dragOver={dragOver} onDragOver={onDragOver} onDrop={onDrop} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────
export default function FileManager({ openPhoto }: { openPhoto?: (url: string, name: string) => void }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<VfsFolder[]>([]);
  const [files, setFiles] = useState<DesktopFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [search, setSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; kind: 'folder' | 'file'; name: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string; kind: 'folder' | 'file' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vfs_folders').select('*').eq('user_id', user.id).order('name');
    setFolders((data as VfsFolder[]) || []);
  }, [user]);

  const loadFiles = useCallback(async (folderId: string | null) => {
    if (!user) return;
    let q = supabase.from('desktop_files').select('*').eq('user_id', user.id);
    if (folderId === null) {
      q = q.is('folder_id', null);
    } else {
      q = q.eq('folder_id', folderId);
    }
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    setFiles((data as DesktopFile[]) || []);
  }, [user]);

  useEffect(() => {
    loadFolders();
    loadFiles(null);
  }, [loadFolders, loadFiles]);

  const selectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedItemId(null);
    loadFiles(folderId);
  }, [loadFiles]);

  // breadcrumb path
  const buildPath = (folderId: string | null): string[] => {
    if (!folderId) return ['Мой компьютер'];
    const parts: string[] = [];
    let id: string | null = folderId;
    while (id) {
      const f = folders.find(x => x.id === id);
      if (!f) break;
      parts.unshift(f.name);
      id = f.parent_id;
    }
    return ['Мой компьютер', ...parts];
  };

  const breadcrumb = buildPath(selectedFolderId);

  // Create folder
  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    const { data } = await supabase.from('vfs_folders').insert({
      user_id: user.id, name: newFolderName.trim(), parent_id: selectedFolderId,
    }).select().single();
    if (data) {
      setFolders(prev => [...prev, data as VfsFolder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName(''); setShowNewFolder(false);
    }
  };

  // Delete folder
  const deleteFolder = async (id: string) => {
    await supabase.from('vfs_folders').delete().eq('id', id);
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolderId === id) selectFolder(null);
    setContextMenu(null);
  };

  // Delete file
  const deleteFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.file_url) {
      // extract path from URL
      const urlParts = file.file_url.split('/desktop-files/');
      if (urlParts[1]) {
        await supabase.storage.from('desktop-files').remove([urlParts[1]]);
      }
    }
    await supabase.from('desktop_files').delete().eq('id', id);
    setFiles(prev => prev.filter(f => f.id !== id));
    setContextMenu(null);
  };

  // Rename folder
  const renameFolder = async (id: string, name: string) => {
    await supabase.from('vfs_folders').update({ name }).eq('id', id);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    setRenaming(null);
  };

  // Rename file
  const renameFile = async (id: string, name: string) => {
    await supabase.from('desktop_files').update({ name }).eq('id', id);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    setRenaming(null);
  };

  // Drag-and-drop: move folder to another folder
  const handleDrop = useCallback(async (targetFolderId: string | null) => {
    if (!dragging) return;
    if (dragging.kind === 'folder') {
      if (dragging.id === targetFolderId) return;
      await supabase.from('vfs_folders').update({ parent_id: targetFolderId }).eq('id', dragging.id);
      await loadFolders();
    } else if (dragging.kind === 'file') {
      await supabase.from('desktop_files').update({ folder_id: targetFolderId }).eq('id', dragging.id);
      await loadFiles(selectedFolderId);
    }
    setDragging(null);
    setDragOver(null);
  }, [dragging, selectedFolderId, loadFolders, loadFiles]);

  // File upload
  const uploadFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data: upload, error } = await supabase.storage.from('desktop-files').upload(path, file, { contentType: file.type });
    if (!error && upload) {
      const { data: urlData } = supabase.storage.from('desktop-files').getPublicUrl(path);
      await supabase.from('desktop_files').insert({
        user_id: user.id, name: file.name.replace(/\.[^.]+$/, ''), original_name: file.name,
        file_url: urlData.publicUrl, file_type: file.type, file_size: file.size,
        folder_id: selectedFolderId, pos_x: 100, pos_y: 100,
      });
      await loadFiles(selectedFolderId);
    }
    setUploading(false);
  };

  // Filter by search
  const displayFolders = folders.filter(f =>
    f.parent_id === selectedFolderId && (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  );
  const displayFiles = files.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.original_name.toLowerCase().includes(search.toLowerCase()));

  const rootFolders = folders.filter(f => !f.parent_id);

  const isImage = (f: DesktopFile) =>
    f.file_type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.original_name);

  const openFile = (f: DesktopFile) => {
    if (isImage(f) && f.file_url && openPhoto) {
      openPhoto(f.file_url, f.name);
    } else if (f.file_url) {
      window.open(f.file_url, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', fontFamily: 'Segoe UI, sans-serif', userSelect: 'none' }}
      onClick={() => setContextMenu(null)}>

      {/* Toolbar */}
      <div style={{ background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)', borderBottom: '1px solid #c0c0c0', padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => selectFolder(null)}
          style={{ background: 'linear-gradient(180deg,#fff,#ddd)', border: '1px solid #bbb', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
          <img src={icNavBack} width={14} height={14} style={{ display: 'block' }} />
        </button>
        <button
          onClick={() => {
            if (selectedFolderId) {
              const f = folders.find(x => x.id === selectedFolderId);
              selectFolder(f?.parent_id || null);
            }
          }}
          style={{ background: 'linear-gradient(180deg,#fff,#ddd)', border: '1px solid #bbb', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
          <img src={icNavUp} width={14} height={14} style={{ display: 'block' }} />
        </button>

        {/* Breadcrumb */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #bbb', borderRadius: 3, padding: '3px 10px', fontSize: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
          {breadcrumb.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#aaa' }}>›</span>}
              <span
                style={{ cursor: 'pointer', color: i === breadcrumb.length - 1 ? '#000' : '#3b82f6' }}
                onClick={() => {
                  if (i === 0) selectFolder(null);
                }}
              >{part}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Поиск"
            style={{ padding: '3px 8px', border: '1px solid #bbb', borderRadius: 3, fontSize: 12, width: 130, outline: 'none' }}
          />
        </div>

        {/* New folder */}
        <button
          onClick={() => setShowNewFolder(s => !s)}
          title="Создать папку"
          style={{ background: 'linear-gradient(180deg,#fff,#ddd)', border: '1px solid #bbb', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
          <img src={icFolderNew} width={18} height={18} style={{ display: 'block' }} />
        </button>

        {/* Upload file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Загрузить файл"
          disabled={uploading}
          style={{ background: 'linear-gradient(180deg,#3b82f6,#2563eb)', border: '1px solid #1d4ed8', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 600 }}>
          {uploading ? '⟳' : '+ Загрузить'}
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
          onChange={async e => { for (const f of Array.from(e.target.files || [])) await uploadFile(f); e.target.value = ''; }} />
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div style={{ background: '#f0f4ff', borderBottom: '1px solid #c0c0c0', padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a3a6a' }}>Новая папка:</span>
          <input
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
            autoFocus
            placeholder="Введите имя..."
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #3b82f6', borderRadius: 3, fontSize: 12, outline: 'none' }}
          />
          <button onClick={createFolder} style={{ background: '#22c55e', border: 'none', borderRadius: 4, padding: '4px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✓</button>
          <button onClick={() => setShowNewFolder(false)} style={{ background: '#ef4444', border: 'none', borderRadius: 4, padding: '4px 10px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT TREE ── */}
        <div
          style={{ width: 200, borderRight: '1px solid #c0c0c0', background: '#f0f0f0', overflowY: 'auto', padding: '6px 4px', flexShrink: 0 }}
          onDragOver={e => { e.preventDefault(); setDragOver('__root__'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => { e.preventDefault(); handleDrop(null); setDragOver(null); }}
        >
          {/* Корневой пункт */}
          <div
            onClick={() => selectFolder(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 12,
              cursor: 'pointer', borderRadius: 3, fontWeight: 600,
              background: selectedFolderId === null ? '#3b82f6' : dragOver === '__root__' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: selectedFolderId === null ? '#fff' : '#1a1a1a',
              marginBottom: 2,
            }}>
            <img src={icFolderOpen} width={16} height={16} style={{ display: 'block' }} />
            Мой компьютер
          </div>
          {rootFolders.map(f => (
            <FolderNode key={f.id} folder={f} allFolders={folders} depth={1}
              selectedId={selectedFolderId} onSelect={fld => selectFolder(fld.id)}
              dragOver={dragOver} onDragOver={setDragOver} onDrop={handleDrop} />
          ))}
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 100px', borderBottom: '1px solid #ddd', padding: '3px 10px', fontSize: 11, color: '#666', fontWeight: 600, background: '#fafafa', flexShrink: 0 }}>
            <span>Имя</span><span>Тип</span><span>Размер</span><span>Изменён</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}
            onDragOver={e => { e.preventDefault(); setDragOver('__content__'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); handleDrop(selectedFolderId); }}
          >
            {displayFolders.length === 0 && displayFiles.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', paddingTop: 40, fontSize: 14 }}>
                {search ? 'Ничего не найдено' : 'Папка пуста'}
              </div>
            )}

            {/* Subfolders */}
            {displayFolders.map(folder => (
              <div
                key={folder.id}
                draggable
                onDragStart={() => setDragging({ kind: 'folder', id: folder.id })}
                onDragEnd={() => setDragging(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 90px 100px',
                  padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 3,
                  background: selectedItemId === folder.id ? '#cce5ff' : dragOver === folder.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onClick={e => { e.stopPropagation(); setSelectedItemId(folder.id); }}
                onDoubleClick={() => selectFolder(folder.id)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, id: folder.id, kind: 'folder' }); }}
                onDragOver={e => { e.preventDefault(); setDragOver(folder.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDrop(folder.id); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={icFolderOpen} width={16} height={16} style={{ display: 'block' }} />
                  {renaming?.id === folder.id && renaming.kind === 'folder' ? (
                    <input
                      autoFocus defaultValue={folder.name}
                      style={{ fontSize: 12, border: '1px solid #3b82f6', borderRadius: 2, padding: '1px 4px', outline: 'none' }}
                      onBlur={e => renameFolder(folder.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id, e.currentTarget.value); if (e.key === 'Escape') setRenaming(null); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : <span>{folder.name}</span>}
                </span>
                <span style={{ color: '#666', alignSelf: 'center' }}>Папка</span>
                <span style={{ color: '#666', alignSelf: 'center' }}>—</span>
                <span style={{ color: '#666', alignSelf: 'center' }}>{formatDate(folder.created_at)}</span>
              </div>
            ))}

            {/* Files */}
            {displayFiles.map(file => (
              <div
                key={file.id}
                draggable
                onDragStart={() => setDragging({ kind: 'file', id: file.id })}
                onDragEnd={() => setDragging(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 90px 100px',
                  padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 3,
                  background: selectedItemId === file.id ? '#cce5ff' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onClick={e => { e.stopPropagation(); setSelectedItemId(file.id); }}
                onDoubleClick={() => openFile(file)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, id: file.id, kind: 'file' }); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <img src={fileIcon(file.file_type)} width={16} height={16} style={{ display: 'block', flexShrink: 0 }} />
                  {renaming?.id === file.id && renaming.kind === 'file' ? (
                    <input
                      autoFocus defaultValue={file.name}
                      style={{ fontSize: 12, border: '1px solid #3b82f6', borderRadius: 2, padding: '1px 4px', outline: 'none', minWidth: 0, flex: 1 }}
                      onBlur={e => renameFile(file.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFile(file.id, e.currentTarget.value); if (e.key === 'Escape') setRenaming(null); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name || file.original_name}
                    </span>
                  )}
                </span>
                <span style={{ color: '#666', alignSelf: 'center', fontSize: 11 }}>
                  {isImage(file) ? 'Рисунок' : file.file_type === 'text' ? 'Текст' : 'Файл'}
                </span>
                <span style={{ color: '#666', alignSelf: 'center' }}>{formatSize(file.file_size)}</span>
                <span style={{ color: '#666', alignSelf: 'center' }}>{formatDate(file.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ borderTop: '1px solid #ddd', padding: '3px 12px', fontSize: 11, color: '#666', background: '#f0f0f0', flexShrink: 0, display: 'flex', gap: 16 }}>
        <span>Папок: {displayFolders.length}</span>
        <span>Файлов: {displayFiles.length}</span>
        {selectedItemId && <span>Выбрано: {
          [...displayFolders, ...displayFiles].find(x => x.id === selectedItemId)
            ? (displayFolders.find(x => x.id === selectedItemId)?.name || displayFiles.find(x => x.id === selectedItemId)?.name)
            : ''
        }</span>}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setContextMenu(null)} />
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999,
            background: '#fff', border: '1px solid #c0c0c0', borderRadius: 4, boxShadow: '2px 4px 12px rgba(0,0,0,0.2)',
            minWidth: 160, padding: '3px 0',
          }} onClick={e => e.stopPropagation()}>
            {[
              { label: '✏️ Переименовать', action: () => { setRenaming({ id: contextMenu.id, kind: contextMenu.kind, name: '' }); setContextMenu(null); } },
              { label: '🗑️ Удалить', action: () => { if (contextMenu.kind === 'folder') deleteFolder(contextMenu.id); else deleteFile(contextMenu.id); } },
              ...(contextMenu.kind === 'file' ? [{ label: '📂 Открыть', action: () => { const f = files.find(x => x.id === contextMenu.id); if (f) openFile(f); setContextMenu(null); } }] : []),
            ].map((item, i) => (
              <button key={i} onClick={item.action}
                style={{ display: 'block', width: '100%', padding: '5px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
