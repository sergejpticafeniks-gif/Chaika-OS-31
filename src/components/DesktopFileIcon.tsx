import React, { useState, useRef, useCallback } from 'react';
import { DesktopFile } from '@/types';

interface DesktopFileIconProps {
  file: DesktopFile;
  onMove: (id: string, x: number, y: number) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpen: (file: DesktopFile) => void;
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  image: { icon: '🖼️', color: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  video: { icon: '🎬', color: 'linear-gradient(135deg, #f97316, #dc2626)' },
  audio: { icon: '🎵', color: 'linear-gradient(135deg, #ec4899, #a855f7)' },
  text:  { icon: '📄', color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  pdf:   { icon: '📕', color: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  word:  { icon: '📘', color: 'linear-gradient(135deg, #2563eb, #1e40af)' },
  excel: { icon: '📗', color: 'linear-gradient(135deg, #16a34a, #15803d)' },
  archive:{ icon: '🗜️', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  file:  { icon: '📎', color: 'linear-gradient(135deg, #6b7280, #4b5563)' },
};

export default function DesktopFileIcon({ file, onMove, onRename, onDelete, onOpen }: DesktopFileIconProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startFileX: number; startFileY: number } | null>(null);
  const iconInfo = FILE_ICONS[file.file_type] || FILE_ICONS.file;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startFileX: file.pos_x, startFileY: file.pos_y };
    let hasMoved = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved = true;
      if (hasMoved) onMove(file.id, Math.max(0, dragRef.current.startFileX + dx), Math.max(0, dragRef.current.startFileY + dy));
    };
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [file, onMove]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setNewName(file.name);
    setRenaming(true);
    setContextMenu(null);
    setTimeout(() => { inputRef.current?.select(); }, 50);
  };

  const commitRename = () => {
    if (newName.trim() && newName !== file.name) onRename(file.id, newName.trim());
    setRenaming(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  return (
    <>
      <div
        style={{ position: 'absolute', left: file.pos_x, top: file.pos_y, zIndex: 10, userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => { if (file.file_url) onOpen(file); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 4px', borderRadius: 4, width: 76, cursor: 'default' }}
          className="desktop-icon"
        >
          {/* File icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 10, background: iconInfo.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            position: 'relative',
          }}>
            {iconInfo.icon}
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.2)', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {file.file_type.slice(0, 3).toUpperCase()}
            </div>
          </div>

          {/* Name */}
          {renaming ? (
            <input
              ref={inputRef}
              style={{ width: 72, fontSize: 11, textAlign: 'center', background: '#fff', border: '1px solid #4488cc', borderRadius: 2, outline: 'none', padding: '1px 2px' }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenaming(false); } }}
              autoFocus
            />
          ) : (
            <div className="desktop-icon-label" title={`${file.name}\n${formatSize(file.file_size)}`}>
              {file.name}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y, zIndex: 99999 }}
          onClick={e => e.stopPropagation()}
          onMouseLeave={() => setContextMenu(null)}
        >
          {file.file_url && (
            <button className="context-menu-item" onClick={() => { window.open(file.file_url!, '_blank'); setContextMenu(null); }}>
              📂 Открыть
            </button>
          )}
          <button className="context-menu-item" onClick={startRename}>✏️ Переименовать</button>
          <div style={{ height: 1, background: '#ccc', margin: '2px 8px' }} />
          <button className="context-menu-item" style={{ color: '#c00' }} onClick={() => { onDelete(file.id); setContextMenu(null); }}>
            🗑️ Удалить
          </button>
        </div>
      )}
    </>
  );
}
