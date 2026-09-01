/**
 * Чайка Командер v1 — Внутренний файловый менеджер с командной строкой
 * Двухпанельный NC/MC-стиль + встроенный терминал
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FsEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  modified?: string;
  ext?: string;
  url?: string;
  id?: string;
}

interface CmdHistoryEntry {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

// ─── Virtual FS ───────────────────────────────────────────────
const VIRTUAL_FS: Record<string, FsEntry[]> = {
  '/': [
    { name: 'Рабочий стол', type: 'dir', modified: '2026-08-06' },
    { name: 'Документы', type: 'dir', modified: '2026-07-15' },
    { name: 'Загрузки', type: 'dir', modified: '2026-08-01' },
    { name: 'Музыка', type: 'dir', modified: '2026-06-10' },
    { name: 'Видео', type: 'dir', modified: '2026-08-05' },
    { name: 'autoexec.ini', type: 'file', size: 1024, modified: '2026-08-06', ext: 'ini' },
    { name: 'readme.txt', type: 'file', size: 512, modified: '2026-08-01', ext: 'txt' },
    { name: 'chaika-os.log', type: 'file', size: 8192, modified: '2026-08-06', ext: 'log' },
  ],
  '/Рабочий стол': [
    { name: '..', type: 'dir' },
    { name: 'Чайка BJS.lnk', type: 'file', size: 256, ext: 'lnk', modified: '2026-08-05' },
    { name: 'Мессенджер.lnk', type: 'file', size: 256, ext: 'lnk', modified: '2026-08-05' },
    { name: 'Мои проекты', type: 'dir', modified: '2026-08-03' },
  ],
  '/Документы': [
    { name: '..', type: 'dir' },
    { name: 'Отчёт_2026.docx', type: 'file', size: 45056, ext: 'docx', modified: '2026-07-30' },
    { name: 'Бюджет.xlsx', type: 'file', size: 32768, ext: 'xlsx', modified: '2026-07-28' },
    { name: 'Проекты', type: 'dir', modified: '2026-07-01' },
  ],
  '/Загрузки': [
    { name: '..', type: 'dir' },
    { name: 'app_v2.bjsx', type: 'file', size: 102400, ext: 'bjsx', modified: '2026-08-06' },
    { name: 'firmware_v4.hex', type: 'file', size: 65536, ext: 'hex', modified: '2026-08-04' },
    { name: 'config.ini', type: 'file', size: 2048, ext: 'ini', modified: '2026-08-03' },
  ],
};

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '<DIR>';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / 1048576).toFixed(1) + ' МБ';
}

function getEntryColor(entry: FsEntry): string {
  if (entry.type === 'dir') return '#93c5fd';
  const extColors: Record<string, string> = {
    ini: '#a78bfa', bjsx: '#34d399', hex: '#f59e0b', elf: '#f59e0b',
    txt: '#e2e8f0', log: '#94a3b8', lnk: '#60a5fa',
    docx: '#3b82f6', xlsx: '#22c55e', pdf: '#ef4444',
    js: '#fbbf24', ts: '#60a5fa', html: '#f97316', css: '#22d3ee',
    py: '#a78bfa', c: '#e2e8f0', cpp: '#e2e8f0',
  };
  return extColors[entry.ext || ''] || '#e2e8f0';
}

function getEntryIcon(entry: FsEntry): string {
  if (entry.type === 'dir') return '📁';
  const icons: Record<string, string> = {
    ini: '⚙️', bjsx: '⌨️', hex: '🔧', elf: '🔧',
    txt: '📄', log: '📋', lnk: '🔗', docx: '📝',
    xlsx: '📊', pdf: '📑', js: '🟨', ts: '🔷',
    html: '🌐', css: '🎨', py: '🐍', c: '©️', cpp: '©️',
    mp3: '🎵', mp4: '🎬', png: '🖼️', jpg: '🖼️',
  };
  return icons[entry.ext || ''] || '📄';
}

// ─── File Panel ────────────────────────────────────────────────
function FilePanel({
  title, path, onPathChange, selected, onSelect, onOpen
}: {
  title: string;
  path: string;
  onPathChange: (p: string) => void;
  selected: number;
  onSelect: (i: number) => void;
  onOpen: (entry: FsEntry) => void;
}) {
  const entries: FsEntry[] = path !== '/' ? [{ name: '..', type: 'dir' }, ...(VIRTUAL_FS[path] || [])] : (VIRTUAL_FS[path] || []);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #1e3a5f', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ background: 'linear-gradient(90deg,#1e3a5f,#1565c0)', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', fontFamily: 'Consolas, monospace' }}>[{title}]</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{path}</span>
      </div>
      {/* Column headers */}
      <div style={{ background: '#0f1929', borderBottom: '1px solid #1e3a5f', padding: '3px 8px', display: 'flex', gap: 0, flexShrink: 0 }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#60a5fa', fontFamily: 'Consolas, monospace' }}>Имя</span>
        <span style={{ width: 70, fontSize: 10, fontWeight: 700, color: '#60a5fa', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>Размер</span>
        <span style={{ width: 80, fontSize: 10, fontWeight: 700, color: '#60a5fa', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>Дата</span>
      </div>
      {/* Entries */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', background: '#050d1a' }}>
        {entries.map((entry, i) => (
          <div
            key={i}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onOpen(entry)}
            style={{
              display: 'flex', gap: 0, padding: '2px 8px', cursor: 'pointer',
              background: selected === i ? '#1565c0' : 'transparent',
              borderBottom: '1px solid rgba(30,58,95,0.3)',
            }}
          >
            <span style={{ flex: 1, fontSize: 12, color: selected === i ? '#fff' : getEntryColor(entry), fontFamily: 'Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11 }}>{getEntryIcon(entry)}</span>
              {entry.name}
            </span>
            <span style={{ width: 70, fontSize: 11, color: selected === i ? '#cfe' : '#64748b', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>
              {entry.type === 'dir' ? '<DIR>' : formatSize(entry.size)}
            </span>
            <span style={{ width: 80, fontSize: 11, color: selected === i ? '#cfe' : '#64748b', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>
              {entry.modified || ''}
            </span>
          </div>
        ))}
      </div>
      {/* Status */}
      <div style={{ background: '#0a1628', borderTop: '1px solid #1e3a5f', padding: '3px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'Consolas, monospace' }}>
          {entries.length} элементов
        </span>
      </div>
    </div>
  );
}

// ─── Main Commander ────────────────────────────────────────────
export default function Commander() {
  const { user } = useAuth();
  const [leftPath, setLeftPath] = useState('/');
  const [rightPath, setRightPath] = useState('/Документы');
  const [leftSel, setLeftSel] = useState(0);
  const [rightSel, setRightSel] = useState(0);
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [cmdHistory, setCmdHistory] = useState<CmdHistoryEntry[]>([
    { type: 'system', text: 'Чайка OS Командер v1.0 — Внутренний файловый менеджер' },
    { type: 'system', text: `Авторизован: ${user?.username || 'гость'} | ${new Date().toLocaleString('ru-RU')}` },
    { type: 'system', text: 'Введите "help" для справки по командам. Двойной клик — открыть. F5 — копировать, F8 — удалить.' },
    { type: 'system', text: '─'.repeat(60) },
  ]);
  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistIdx, setCmdHistIdx] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'panels' | 'terminal' | 'viewer'>('panels');
  const [viewerContent, setViewerContent] = useState<{ name: string; content: string } | null>(null);
  const [dbFiles, setDbFiles] = useState<{ id: string; name: string; file_url: string; file_type: string }[]>([]);

  const termEnd = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);

  useEffect(() => { termEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [cmdHistory]);

  // Load real files from Supabase
  useEffect(() => {
    if (!user) return;
    supabase.from('desktop_files').select('id,name,file_url,file_type').eq('user_id', user.id)
      .then(({ data }) => { if (data) setDbFiles(data as any); });
  }, [user]);

  const addOutput = (text: string, type: CmdHistoryEntry['type'] = 'output') => {
    setCmdHistory(h => [...h, { type, text }]);
  };

  const handleOpen = useCallback((entry: FsEntry, panel: 'left' | 'right') => {
    const path = panel === 'left' ? leftPath : rightPath;
    const setPath = panel === 'left' ? setLeftPath : setRightPath;
    if (entry.type === 'dir') {
      if (entry.name === '..') {
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        setPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
      } else {
        const newPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
        setPath(newPath);
      }
    } else {
      // View file
      const content = generateFileContent(entry);
      setViewerContent({ name: entry.name, content });
      setActiveView('viewer');
      addOutput(`Открыт файл: ${entry.name}`, 'system');
    }
  }, [leftPath, rightPath]);

  const generateFileContent = (entry: FsEntry): string => {
    if (entry.ext === 'ini') return `[device]\nname = ChaikaDevice\ntype = arduino\nport = COM3\nbaud = 9600\n\n[hasp]\nenabled = true\nslot = 1\nvendor_code = 0x1234\n\n[gpio]\npin13_mode = output\npin2_mode = input`;
    if (entry.ext === 'log') return `[2026-08-06 12:00:01] INFO  Чайка ОС v31 запущена\n[2026-08-06 12:00:02] INFO  HASP: ключ проверяется...\n[2026-08-06 12:00:04] WARN  HASP: ключ не найден\n[2026-08-06 12:00:05] INFO  Рабочий стол загружен\n[2026-08-06 12:01:00] INFO  Пользователь вошёл в систему`;
    if (entry.ext === 'txt') return `Чайка ОС v31\n============\n\nОблачная операционная система нового поколения.\nВсе приложения работают в браузере.\n\nДокументация: /special\nAPI: /api/chaika-os-api.json`;
    if (entry.ext === 'bjsx') return `// Чайка BJS — формат приложения v1\n// .bjsx — Chaika Binary JavaScript eXtended\n\n{\n  "manifest": {\n    "name": "my-app",\n    "version": "2.0.0",\n    "target": "chaika-os"\n  },\n  "code": "// Основной код приложения\\nconsole.log('Hello, Чайка!');",\n  "dependencies": [],\n  "permissions": ["user:id"]\n}`;
    return `// ${entry.name}\n// Файл не может быть отображён в текстовом виде`;
  };

  const COMMANDS: Record<string, (args: string[]) => void> = {
    help: () => {
      addOutput('Доступные команды:');
      addOutput('  ls [path]      — список файлов');
      addOutput('  cd <path>      — сменить директорию');
      addOutput('  cat <file>     — показать содержимое файла');
      addOutput('  mkdir <name>   — создать папку');
      addOutput('  rm <file>      — удалить файл');
      addOutput('  cp <src> <dst> — копировать');
      addOutput('  mv <src> <dst> — переместить');
      addOutput('  pwd            — текущий путь');
      addOutput('  cls / clear    — очистить терминал');
      addOutput('  echo <text>    — вывести текст');
      addOutput('  date           — дата и время');
      addOutput('  whoami         — текущий пользователь');
      addOutput('  sysinfo        — информация о системе');
      addOutput('  hasp           — проверить HASP-ключ');
      addOutput('  api status     — статус Чайка API');
      addOutput('  api apps       — список приложений');
      addOutput('  api gpio <pin> — читать GPIO пин');
      addOutput('  open <app>     — открыть приложение');
      addOutput('  panels         — переключиться на панели');
    },
    ls: (args) => {
      const p = args[0] || (activePanel === 'left' ? leftPath : rightPath);
      const entries = VIRTUAL_FS[p];
      if (!entries) { addOutput(`ls: ${p}: нет такого пути`, 'error'); return; }
      addOutput(`Содержимое ${p}:`);
      entries.forEach(e => addOutput(`  ${e.type === 'dir' ? '[DIR]' : '     '} ${e.name.padEnd(24)} ${formatSize(e.size)}`));
    },
    cd: (args) => {
      if (!args[0]) { addOutput('Использование: cd <путь>'); return; }
      const target = args[0] === '..' ? '/' : (args[0].startsWith('/') ? args[0] : `${leftPath}/${args[0]}`);
      if (VIRTUAL_FS[target] !== undefined) {
        if (activePanel === 'left') setLeftPath(target);
        else setRightPath(target);
        addOutput(`Текущий каталог: ${target}`);
      } else { addOutput(`cd: ${target}: нет такого каталога`, 'error'); }
    },
    pwd: () => addOutput(activePanel === 'left' ? leftPath : rightPath),
    cat: (args) => {
      if (!args[0]) { addOutput('Использование: cat <файл>'); return; }
      const ext = args[0].split('.').pop() || '';
      const fake: FsEntry = { name: args[0], type: 'file', ext };
      const content = generateFileContent(fake);
      content.split('\n').forEach(line => addOutput(line));
    },
    cls: () => { setCmdHistory([{ type: 'system', text: 'Терминал очищен.' }]); },
    clear: (args) => COMMANDS.cls(args),
    echo: (args) => addOutput(args.join(' ')),
    date: () => addOutput(new Date().toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'medium' })),
    whoami: () => addOutput(user?.username || 'гость'),
    sysinfo: () => {
      addOutput('=== Чайка ОС v31 — Системная информация ===');
      addOutput(`  ОС:        Чайка ОС v31`);
      addOutput(`  Платформа: Web Browser (React/Vite)`);
      addOutput(`  Пользователь: ${user?.username || 'гость'}`);
      addOutput(`  Браузер:   ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
      addOutput(`  Время:     ${new Date().toLocaleString('ru-RU')}`);
      addOutput(`  Память:    ${Math.round((performance as any)?.memory?.usedJSHeapSize / 1048576 || 0)} МБ`);
    },
    hasp: async () => {
      addOutput('Проверка HASP-ключа...');
      await new Promise(r => setTimeout(r, 800));
      const found = Math.random() > 0.4;
      if (found) addOutput('✔ HASP-ключ найден. Лицензия активна до 31.12.2026', 'output');
      else addOutput('✖ HASP-ключ не обнаружен. Работа в ограниченном режиме.', 'error');
    },
    panels: () => { setActiveView('panels'); addOutput('Переключение на панели файлов.'); },
    open: (args) => {
      if (!args[0]) { addOutput('Использование: open <app-id>'); return; }
      window.dispatchEvent(new CustomEvent('chaika-open-app', { detail: { appId: args[0] } }));
      addOutput(`Открываю приложение: ${args[0]}`);
    },
    api: async (args) => {
      const BJS_BASE = 'https://icpkofdygbgladqsicpk.backend.onspace.ai/functions/v1/chaika-os-api';
      const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWYiOiJpY3Brb2ZkeWdiZ2xhZHFzaWNwayIsInJvbGUiOiJhbm9uIiwiaXNzIjoib25zcGFjZSIsImlhdCI6MTc4MTY4OTQ5NywiZXhwIjoyMDk3MDQ5NDk3fQ.E4xHvhJutKpbaWjhTJh33AcHjLbhKSkTaiLwGphCO98';
      const sub = args[0];
      if (!sub) { addOutput('Использование: api [status|apps|gpio <pin>|system]'); return; }

      addOutput(`Запрос к Чайка API: /${sub}...`);
      try {
        let url = `${BJS_BASE}/${sub}`;
        if (sub === 'gpio' && args[1]) url = `${BJS_BASE}/gpio/read/${args[1]}`;
        const res = await fetch(url, { headers: { apikey: KEY, 'x-chaika-app-id': 'com.chaika.commander' } });
        const data = await res.json();
        const lines = JSON.stringify(data, null, 2).split('\n');
        lines.slice(0, 20).forEach(l => addOutput('  ' + l));
        if (lines.length > 20) addOutput(`  ... и ещё ${lines.length - 20} строк`);
      } catch (e: any) {
        addOutput(`API ошибка: ${e.message}`, 'error');
      }
    },
    mkdir: (args) => { if (args[0]) addOutput(`mkdir: ${args[0]} создан (виртуально)`); else addOutput('mkdir: укажите имя папки', 'error'); },
    rm: (args) => { if (args[0]) addOutput(`rm: ${args[0]} удалён (виртуально)`); else addOutput('rm: укажите файл', 'error'); },
    cp: (args) => { if (args[1]) addOutput(`cp: ${args[0]} → ${args[1]} (виртуально)`); else addOutput('cp: укажите источник и назначение', 'error'); },
    mv: (args) => { if (args[1]) addOutput(`mv: ${args[0]} → ${args[1]} (виртуально)`); else addOutput('mv: укажите источник и назначение', 'error'); },
  };

  const runCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addOutput(`$ ${trimmed}`, 'input');
    setInputHistory(h => [trimmed, ...h.slice(0, 49)]);
    setCmdHistIdx(-1);
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (COMMANDS[cmd]) await COMMANDS[cmd](args);
    else addOutput(`Команда не найдена: ${cmd}. Введите "help".`, 'error');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { runCommand(cmdInput); setCmdInput(''); }
    else if (e.key === 'ArrowUp') {
      const idx = Math.min(cmdHistIdx + 1, inputHistory.length - 1);
      setCmdHistIdx(idx);
      setCmdInput(inputHistory[idx] || '');
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      const idx = Math.max(cmdHistIdx - 1, -1);
      setCmdHistIdx(idx);
      setCmdInput(idx === -1 ? '' : inputHistory[idx] || '');
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete
      const path = activePanel === 'left' ? leftPath : rightPath;
      const entries = VIRTUAL_FS[path] || [];
      const word = cmdInput.split(' ').pop() || '';
      const match = entries.find(e => e.name.toLowerCase().startsWith(word.toLowerCase()));
      if (match) setCmdInput(cmdInput.slice(0, -word.length) + match.name);
    }
  };

  const termLineColor = (type: CmdHistoryEntry['type']) => {
    if (type === 'input') return '#fbbf24';
    if (type === 'error') return '#f87171';
    if (type === 'system') return '#60a5fa';
    return '#e2e8f0';
  };

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); addOutput('F5: Копирование (виртуально)'); }
      else if (e.key === 'F8') { e.preventDefault(); addOutput('F8: Удаление (виртуально)'); }
      else if (e.key === 'F10') { e.preventDefault(); setActiveView('panels'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050d1a', fontFamily: 'Consolas, "Courier New", monospace', color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Top menu bar */}
      <div style={{ background: '#0a1628', borderBottom: '1px solid #1e3a5f', padding: '4px 12px', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', letterSpacing: 1 }}>Командер</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['panels', 'terminal'] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              style={{ padding: '3px 12px', background: activeView === v ? '#1565c0' : 'rgba(255,255,255,0.05)', border: '1px solid #1e3a5f', borderRadius: 4, color: activeView === v ? '#fff' : '#60a5fa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {v === 'panels' ? '📂 Панели' : '🖥️ Терминал'}
            </button>
          ))}
          {viewerContent && (
            <button onClick={() => setActiveView('viewer')} style={{ padding: '3px 12px', background: activeView === 'viewer' ? '#1565c0' : 'rgba(255,255,255,0.05)', border: '1px solid #1e3a5f', borderRadius: 4, color: activeView === 'viewer' ? '#fff' : '#60a5fa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              👁 {viewerContent.name}
            </button>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#334155' }}>F5 Копировать · F8 Удалить · F10 Панели · Tab Авто-дополнение</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Panels view */}
        {activeView === 'panels' && (
          <div style={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden', padding: '4px 4px 0' }}
            onClick={() => setActiveView('panels')}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', outline: activePanel === 'left' ? '2px solid #1565c0' : '2px solid transparent', borderRadius: 4, overflow: 'hidden' }}
              onClick={() => setActivePanel('left')}>
              <FilePanel
                title="Левая"
                path={leftPath}
                onPathChange={setLeftPath}
                selected={leftSel}
                onSelect={setLeftSel}
                onOpen={(e) => handleOpen(e, 'left')}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', outline: activePanel === 'right' ? '2px solid #1565c0' : '2px solid transparent', borderRadius: 4, overflow: 'hidden' }}
              onClick={() => setActivePanel('right')}>
              <FilePanel
                title="Правая"
                path={rightPath}
                onPathChange={setRightPath}
                selected={rightSel}
                onSelect={setRightSel}
                onOpen={(e) => handleOpen(e, 'right')}
              />
            </div>
          </div>
        )}

        {/* Terminal view */}
        {activeView === 'terminal' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 4 }}>
            <div style={{ flex: 1, overflowY: 'auto', background: '#020810', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 12px' }}>
              {cmdHistory.map((line, i) => (
                <div key={i} style={{ color: termLineColor(line.type), fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {line.text}
                </div>
              ))}
              <div ref={termEnd} />
            </div>
          </div>
        )}

        {/* Viewer */}
        {activeView === 'viewer' && viewerContent && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 4 }}>
            <div style={{ background: 'linear-gradient(90deg,#1e3a5f,#1565c0)', padding: '5px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderRadius: '4px 4px 0 0' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>👁 {viewerContent.name}</span>
              <button onClick={() => setActiveView('panels')} style={{ background: 'rgba(239,68,68,0.3)', border: 'none', borderRadius: 4, color: '#fca5a5', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>✕ Закрыть</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#020810', border: '1px solid #1e3a5f', borderRadius: '0 0 4px 4px', padding: '12px 16px' }}>
              <pre style={{ color: '#a5b4fc', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'Consolas, monospace' }}>
                {viewerContent.content}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Command line (always visible) */}
      <div style={{ background: '#0a1628', borderTop: '1px solid #1e3a5f', padding: '4px 8px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 700 }}>{activePanel === 'left' ? leftPath : rightPath}&gt;</span>
        <input
          ref={cmdRef}
          value={cmdInput}
          onChange={e => setCmdInput(e.target.value)}
          onKeyDown={handleKey}
          onClick={() => setActiveView('terminal')}
          placeholder="Введите команду... (Enter — выполнить, Tab — дополнить, ↑↓ — история)"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fbbf24', fontSize: 13, fontFamily: 'Consolas, monospace' }}
          autoComplete="off"
        />
      </div>

      {/* Function key bar */}
      <div style={{ background: '#050d1a', borderTop: '1px solid #0f1929', padding: '3px 4px', display: 'flex', gap: 2, flexShrink: 0 }}>
        {[
          { key: 'F1', label: 'Помощь' }, { key: 'F2', label: 'Меню' },
          { key: 'F3', label: 'Просмотр' }, { key: 'F4', label: 'Ред.' },
          { key: 'F5', label: 'Копир.' }, { key: 'F6', label: 'Переим.' },
          { key: 'F7', label: 'Папка' }, { key: 'F8', label: 'Удалить' },
          { key: 'F9', label: 'Меню' }, { key: 'F10', label: 'Выход' },
        ].map(f => (
          <button key={f.key}
            onClick={() => {
              if (f.key === 'F1') runCommand('help');
              else if (f.key === 'F5') addOutput('F5: Копировать (выберите файл)');
              else if (f.key === 'F7') runCommand('mkdir new_folder');
              else if (f.key === 'F8') addOutput('F8: Удалить (выберите файл)');
              else if (f.key === 'F10') setActiveView('panels');
            }}
            style={{ flex: 1, padding: '3px 2px', background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 3, color: '#60a5fa', fontSize: 10, cursor: 'pointer', fontFamily: 'Consolas, monospace', textAlign: 'center' }}>
            <span style={{ color: '#93c5fd', fontWeight: 700 }}>{f.key}</span>
            <span style={{ color: '#475569', marginLeft: 2 }}>{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
