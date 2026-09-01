import React, { useState, useCallback, useRef } from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';
import Window from '@/components/Window';
import Taskbar from '@/components/Taskbar';
import StartMenu from '@/components/StartMenu';
import DesktopIcon from '@/components/DesktopIcon';
import DesktopFileIcon from '@/components/DesktopFileIcon';
import Notepad from '@/components/apps/Notepad';
import Calculator from '@/components/apps/Calculator';
import FileManager from '@/components/apps/FileManager';
import Browser from '@/components/apps/Browser';
import Settings, { WALLPAPERS, OsTheme } from '@/components/apps/Settings';
import Paint from '@/components/apps/Paint';
import WebApp from '@/components/apps/WebApp';
import AdminPanel from '@/components/apps/AdminPanel';
import ChaikaMessenger from '@/components/apps/Messenger';
import CRM from '@/components/apps/CRM';
import RussiaPortal from '@/components/apps/RussiaPortal';
import IndexWidget from '@/components/IndexWidget';
import SplashScreen from '@/components/SplashScreen';
import DesktopClock from '@/components/DesktopClock';
import AIAssistant from '@/components/AIAssistant';
import AIAssistantButton from '@/components/AIAssistantButton';
import NotificationToast from '@/components/NotificationToast';
import WordProcessor from '@/components/apps/WordProcessor';
import Spreadsheet from '@/components/apps/Spreadsheet';
import Rigonda from '@/components/apps/Rigonda';
import Solitaire from '@/components/apps/Solitaire';
import IDE from '@/components/apps/IDE';
import Tumba from '@/components/apps/Tumba';
import SystemConfigurator from '@/components/apps/SystemConfigurator';
import Commander from '@/components/apps/Commander';
import WeatherApp from '@/components/apps/WeatherApp';
import CurrencyApp from '@/components/apps/CurrencyApp';
import Pomodoro from '@/components/apps/Pomodoro';
import MarkdownEditor from '@/components/apps/MarkdownEditor';
import PasswordGen from '@/components/apps/PasswordGen';
import WorldClock from '@/components/apps/WorldClock';
import JsonTool from '@/components/apps/JsonTool';
import Translator from '@/components/apps/Translator';
import QRGenerator from '@/components/apps/QRGenerator';
import DigitalPassport from '@/components/apps/DigitalPassport';
import AppStoreBrowser from '@/components/apps/AppStoreBrowser';
import UnitConverter from '@/components/apps/UnitConverter';
import TimerApp from '@/components/apps/TimerApp';
import HashTool from '@/components/apps/HashTool';
import { DESKTOP_ICONS } from '@/constants/apps';
import { WallpaperOption, DesktopFile, AppWindow } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useDesktopFiles } from '@/hooks/useDesktopFiles';
import { useCustomApps } from '@/hooks/useCustomApps';
import { useNotifications } from '@/hooks/useNotifications';
import { setIconOverrides, getAppIcon } from '@/lib/iconMap';
import icCtxCopy from '@/assets/icons/ctx-copy.png';
import icCtxPaste from '@/assets/icons/ctx-paste.png';
import icCtxProps from '@/assets/icons/ctx-props.png';
import icTrayUpload from '@/assets/icons/tray-upload.png';

// URL mapping for WebApp-based apps (avoids individual switch cases)
const WEB_APP_URLS: Record<string, { url: string; title: string; icon: string }> = {
  'dzen':         { url: 'https://dzen.ru',                    title: 'Дзен',             icon: '📰' },
  'rbc':          { url: 'https://rbc.ru',                     title: 'РБК',              icon: '📊' },
  'lenta':        { url: 'https://lenta.ru',                   title: 'Lenta.ru',         icon: '📰' },
  'kinopoisk':    { url: 'https://www.kinopoisk.ru',           title: 'Кинопоиск',        icon: '🎬' },
  'hh':           { url: 'https://hh.ru',                      title: 'HeadHunter',       icon: '💼' },
  'avito':        { url: 'https://www.avito.ru',               title: 'Авито',            icon: '🛍️' },
  '2gis':         { url: 'https://2gis.ru',                    title: '2ГИС',             icon: '🗺️' },
  'habr':         { url: 'https://habr.com',                   title: 'Хабр',             icon: '👨‍💻' },
  'pikabu':       { url: 'https://pikabu.ru',                  title: 'Пикабу',           icon: '😄' },
  'wikipedia':    { url: 'https://ru.wikipedia.org',           title: 'Википедия',        icon: '📖' },
  'ozon':         { url: 'https://www.ozon.ru',                title: 'Ozon',             icon: '🛒' },
  'wildberries':  { url: 'https://www.wildberries.ru',         title: 'Wildberries',      icon: '🛍️' },
  'ria':          { url: 'https://ria.ru',                     title: 'РИА Новости',      icon: '📡' },
  'iz':           { url: 'https://iz.ru',                      title: 'Известия',         icon: '🗞️' },
  'yandex-music': { url: 'https://music.yandex.ru',           title: 'Яндекс.Музыка',    icon: '🎵' },
  'yandex-news':  { url: 'https://news.yandex.ru',            title: 'Яндекс.Новости',   icon: '📰' },
  'yandex-maps':  { url: 'https://yandex.ru/maps',            title: 'Яндекс.Карты',     icon: '🗺️' },
  'yandex-disk':  { url: 'https://disk.yandex.ru',            title: 'Яндекс.Диск',      icon: '☁️' },
  'tinkoff':      { url: 'https://www.tinkoff.ru',             title: 'Т-Банк',           icon: '💳' },
  'sber':         { url: 'https://online.sberbank.ru',         title: 'СберБанк',         icon: '🟢' },
  'stepik':       { url: 'https://stepik.org',                 title: 'Stepik',           icon: '🎓' },
  'github':       { url: 'https://github.com',                 title: 'GitHub',           icon: '🐙' },
  'stackoverflow':{ url: 'https://stackoverflow.com',          title: 'Stack Overflow',   icon: '❓' },
  'figma':        { url: 'https://www.figma.com',              title: 'Figma',            icon: '🎨' },
  'netologia':    { url: 'https://netology.ru',                title: 'Нетология',        icon: '🎓' },
};

export default function Desktop() {
  const { user, isAdmin, logout } = useAuth();
  const {
    windows, openApp, closeWindow, minimizeWindow,
    toggleMaximize, focusWindow, updateWindowPosition,
    updateWindowSize, restoreWindow,
  } = useWindowManager();

  const { files, uploading, uploadFile, moveFile, renameFile, deleteFile } = useDesktopFiles();
  const { customApps } = useCustomApps();
  const { unreadCount, notifications, markAllRead, toastQueue, dismissToast } = useNotifications();

  const [showStart, setShowStart]           = useState(false);
  const [wallpaper, setWallpaper]           = useState<WallpaperOption>(WALLPAPERS[0]);
  const [currentTheme, setCurrentTheme]     = useState<OsTheme | null>(null);
  const [contextMenu, setContextMenu]       = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver]         = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showIndexWidget, setShowIndexWidget]     = useState(false);
  const [showSplash, setShowSplash]         = useState(true);
  const [haspWarning, setHaspWarning]       = useState(false);
  const [haspChecked, setHaspChecked]       = useState(false);
  const [haspStatus, setHaspStatus]         = useState<'unknown' | 'found' | 'not_found'>('unknown');
  const [showAI, setShowAI]                 = useState(false);
  const [showAIButton, setShowAIButton]     = useState(true);
  const [clipboard, setClipboard]           = useState<string>('');
  const [, forceIconRefresh]                = useState(0);

  React.useEffect(() => {
    if (!currentTheme) return;
    document.documentElement.style.setProperty('--theme-taskbar',  currentTheme.taskbarGradient);
    document.documentElement.style.setProperty('--theme-titlebar-active',   currentTheme.titlebarActive);
    document.documentElement.style.setProperty('--theme-titlebar-inactive', currentTheme.titlebarInactive);
    document.documentElement.style.setProperty('--theme-accent', currentTheme.accentColor);
    const wp = WALLPAPERS.find(w => w.id === currentTheme.wallpaperId);
    if (wp) setWallpaper(wp);
  }, [currentTheme]);

  React.useEffect(() => {
    const load = async () => {
      const { supabase: sb } = await import('@/lib/supabase');
      const { data } = await sb.from('app_icon_overrides').select('*');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => { map[row.app_id] = row.icon_url; });
        setIconOverrides(map);
        forceIconRefresh(n => n + 1);
      }
    };
    load();
    window.addEventListener('icon-overrides-updated', load);
    return () => window.removeEventListener('icon-overrides-updated', load);
  }, []);

  const dropPosRef = useRef({ x: 200, y: 200 });

  // HASP check after splash
  React.useEffect(() => {
    if (showSplash || haspChecked) return;
    setHaspChecked(true);
    const runHaspCheck = async () => {
      console.log('[HASP] Checking hardware security key...');
      await new Promise(r => setTimeout(r, 1200));
      const keyFound = 'usb' in navigator && Math.random() > 0.6;
      if (!keyFound) {
        setHaspWarning(true);
        setHaspStatus('not_found');
        console.warn('[HASP] Key not detected');
      } else {
        setHaspStatus('found');
        console.log('[HASP] Key found — full protection active');
      }
    };
    runHaspCheck();
  }, [showSplash, haspChecked]);

  // Periodic HASP re-check every 5 minutes
  React.useEffect(() => {
    if (showSplash) return;
    const interval = setInterval(async () => {
      const prevStatus = haspStatus;
      await new Promise(r => setTimeout(r, 800));
      const keyFound = 'usb' in navigator && Math.random() > 0.6;
      const newStatus: 'found' | 'not_found' = keyFound ? 'found' : 'not_found';
      if (newStatus !== prevStatus) {
        setHaspStatus(newStatus);
        if (newStatus === 'not_found' && prevStatus === 'found') {
          setHaspWarning(true);
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const p = (f: number, s: number, d: number, t: OscillatorType = 'square') => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.type = t; o.frequency.setValueAtTime(f, ctx.currentTime + s);
              g.gain.setValueAtTime(0.25, ctx.currentTime + s);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
              o.connect(g); g.connect(ctx.destination);
              o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + d);
            };
            p(880, 0, 0.2); p(660, 0.25, 0.2); p(440, 0.5, 0.4);
          } catch {}
        } else if (newStatus === 'found' && prevStatus === 'not_found') {
          setHaspWarning(false);
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showSplash, haspStatus]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const { appId } = (e as CustomEvent).detail || {};
      if (appId) openApp(appId);
    };
    window.addEventListener('chaika-open-app', handler);
    return () => window.removeEventListener('chaika-open-app', handler);
  }, [openApp]);

  const activeWindowId = windows.filter(w => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;

  const handleDesktopClick = () => { setShowStart(false); setContextMenu(null); setShowNotifications(false); };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); };
  const handleTaskbarWindowClick = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    if (win.isMinimized) restoreWindow(id);
    else if (win.id === activeWindowId) minimizeWindow(id);
    else focusWindow(id);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); dropPosRef.current = { x: e.clientX - 24, y: e.clientY - 24 }; };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const { x, y } = dropPosRef.current;
    for (let i = 0; i < e.dataTransfer.files.length; i++) await uploadFile(e.dataTransfer.files[i], x, y + i * 90);
  };
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    let posX = 200, posY = 100;
    for (const file of Array.from(e.target.files)) { await uploadFile(file, posX, posY); posY += 90; }
    e.target.value = '';
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F1') { e.preventDefault(); setShowAI(s => !s); setShowAIButton(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleOpenFile = (file: DesktopFile) => {
    const isImg = file.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.original_name || '');
    if (isImg && file.file_url) {
      openApp('paint_photo', { title: file.name || file.original_name || 'Фото', icon: '🎨', defaultWidth: 800, defaultHeight: 560, minWidth: 400, minHeight: 300, customUrl: file.file_url });
    } else if (file.file_url) {
      window.open(file.file_url, '_blank');
    }
  };

  const handleOpenCustomApp = useCallback((id: string, title: string, url: string, icon: string, logoUrl?: string) => {
    openApp(`custom_${id}`, { title, icon, defaultWidth: 1000, defaultHeight: 680, minWidth: 400, minHeight: 300, customUrl: url, customLogoUrl: logoUrl });
  }, [openApp]);

  const renderAppContent = (win: AppWindow) => {
    const appId = win.appId;

    if (appId.startsWith('custom_')) {
      const url = win.customUrl;
      if (url) return <WebApp url={url} title={win.title} icon={win.icon} />;
      const ca = customApps.find(a => a.id === appId.replace('custom_', ''));
      if (ca) return <WebApp url={ca.url} title={ca.title} icon={ca.logo_emoji || '🌐'} />;
      return <div style={{ padding: 20 }}>Приложение не найдено</div>;
    }
    if (appId === 'paint_photo') return <Paint initialImageUrl={win.customUrl} />;

    // Generic WebApp URL handler for internet apps
    if (WEB_APP_URLS[appId]) {
      const { url, title, icon } = WEB_APP_URLS[appId];
      return <WebApp url={url} title={title} icon={icon} />;
    }

    switch (appId) {
      case 'notepad':      return <Notepad />;
      case 'calculator':   return <Calculator />;
      case 'filemanager':  return (
        <FileManager openPhoto={(url, name) => {
          openApp(`paint_photo_${Date.now()}`, { title: name, icon: '🎨', defaultWidth: 800, defaultHeight: 560, minWidth: 400, minHeight: 300, customUrl: url });
        }} />
      );
      case 'browser':      return <Browser />;
      case 'settings':     return <Settings onWallpaperChange={setWallpaper} currentWallpaper={wallpaper} onThemeChange={setCurrentTheme} currentTheme={currentTheme} />;
      case 'paint':        return <Paint />;
      case 'messenger':    return <ChaikaMessenger />;
      case 'admin':        return <AdminPanel />;
      case 'word':         return <WordProcessor />;
      case 'excel':        return <Spreadsheet />;
      case 'winamp':
      case 'rigonda':      return <Rigonda />;
      case 'solitaire':    return <Solitaire />;
      case 'ide':          return <IDE />;
      case 'crm':          return <CRM />;
      case 'russia':       return <WebApp url="https://preview-react-9bi4d2-57mcf7tzxcpunfzwstannu.onspace.build/?_q=57McF7TzxCpuNfzWSTaNnu" title="Я-Россия: Аналитика" icon="🇷🇺" />;
      case 'max':          return <WebApp url="https://max.ru" title="Мессенджер Макс" icon="💬" />;
      case 'gosuslugi':    return <WebApp url="https://gosuslugi.ru" title="Госуслуги" icon="🏛️" />;
      case 'vk':           return <WebApp url="https://vk.com" title="ВКонтакте" icon="🔵" />;
      case 'yandex':       return <WebApp url="https://yandex.ru" title="Яндекс" icon="🔴" />;
      case 'rutube':       return <WebApp url="https://rutube.ru" title="Rutube" icon="📺" />;
      case 'mail':         return <WebApp url="https://mail.ru" title="Почта Mail.ru" icon="📧" />;
      case 'ok':           return <WebApp url="https://ok.ru" title="Одноклассники" icon="🟠" />;
      case 'tumba':        return <Tumba />;
      case 'bjs':          return <WebApp url="https://preview-react-9bi9x1-gr6mgaf8hgy8rzqcn4cgad.onspace.build/?_q=gr6MgAf8hgy8RzqCN4CgAd" title="Чайка BJS" icon="⌨️" />;
      case 'ya-russia-new':return <WebApp url="https://preview-react-9bi4d2-57mcf7tzxcpunfzwstannu.onspace.build/?_q=57McF7TzxCpuNfzWSTaNnu" title="Я-Россия: Аналитика" icon="📈" />;
      case 'aerotunnel':   return <WebApp url="https://preview-react-9bi0su-8xgmxbxr5smyyfkiqivmud.onspace.build/?_q=8XGmxBxr5SmyyFkiQiVmUD" title="Чайк.АДТ" icon="🌀" />;
      case 'chaika-bin':   return <WebApp url="https://preview-react-9bid7j-nnmtdkup4deapapgtjuhbs.onspace.build/?_q=NNMTDKUP4deApAPGTjUHBS" title="Чайка.BIN" icon="🔲" />;
      case 'konstruktor':  return <WebApp url="https://preview-react-9bhh2a-aglyqhbxbgwtyjyqvrazj5.onspace.build/?_q=agLyQHBXBGWTyJyqVrAzj5" title="КонструкторПлат" icon="🔌" />;
      case 'treugolnik':   return <WebApp url="https://preview-react-9bh47r-dxlixkek9kteroz9nh6jw3.onspace.build/?_q=dxLixkEk9KteRoz9nH6JW3" title="Треугольник" icon="🔺" />;
      case 'obsmneniye':   return <WebApp url="https://preview-react-9bhdju-wuyrl42xrwaxajwbtbyqwv.onspace.build/?_q=WUYRL42xRWAXaJWbTBYqWV" title="Общественное мнение" icon="🗣️" />;
      case 'rubicad':      return <WebApp url="https://preview-react-9bhuh5-58syjfmwfajxqiqgg3jaxa.onspace.build/" title="RubiCAD" icon="📐" />;
      case 'vagner':       return <WebApp url="https://preview-react-9bh10a-gw8rj2gpa6gnhxcrsame63.onspace.build/?_q=Gw8RJ2Gpa6GNhxcrSAme63" title="Наследие Вагнер 2022" icon="🎮" />;
      case 'marketplus':   return <WebApp url="https://preview-react-9bhvs2-b7f3vbpv3vvbp4usdhjwrn.onspace.build/" title="МаркетПлюс" icon="🛒" />;
      case 'knopochki':    return <WebApp url="https://preview-react-9biodi-5crvpfwoa9ncndx6hhtmsc.onspace.build/" title="Кнопочки" icon="📌" />;
      case 'ini-fw':       return <WebApp url="https://preview-react-9bi1ec-j2edv6kqtaa3v6m39cmeif.onspace.build/?_q=j2eDV6Kqtaa3V6M39cMeiF" title="INI.framework" icon="⚙️" />;
      case 'biolab':       return <WebApp url="https://preview-react-9bhjwl-cwvvqmabtc78t4nynhadrj.onspace.build/?_q=cwvvqmabtC78T4NYNHadRJ" title="Чайка.BioLab" icon="🧬" />;
      case 'chaika-doc':   return <WebApp url="https://preview-react-9bhjwl-cwvvqmabtc78t4nynhadrj.onspace.build/?_q=cwvvqmabtC78T4NYNHadRJ" title="Чайка.DOC" icon="📋" />;
      case 'sysconfig':    return <SystemConfigurator />;
      case 'commander':    return <Commander />;
      case 'weather':      return <WeatherApp />;
      case 'currency':     return <CurrencyApp />;
      case 'pomodoro':     return <Pomodoro />;
      case 'markdown':     return <MarkdownEditor />;
      case 'passgen':      return <PasswordGen />;
      case 'worldclock':   return <WorldClock />;
      case 'jsontool':     return <JsonTool />;
      case 'translator':   return <Translator />;
      case 'qrgen':        return <QRGenerator />;
      case 'passport':     return <DigitalPassport />;
      case 'osm':          return <WebApp url="https://www.openstreetmap.org/export/embed.html?bbox=37.0,55.4,38.0,56.0&layer=mapnik" title="Карты OpenStreetMap" icon="🗺️" />;
      // v32.1 built-in tools
      case 'unitconv':     return <UnitConverter />;
      case 'timer':        return <TimerApp />;
      case 'hashtool':     return <HashTool />;
      case 'appstore':     return <AppStoreBrowser />;
      default:             return <div style={{ padding: 20 }}>Приложение не найдено</div>;
    }
  };

  const bgStyle: React.CSSProperties = wallpaper.url
    ? { backgroundImage: `url("${wallpaper.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: wallpaper.color };

  const handleCopy = () => {
    const sel = window.getSelection()?.toString() || '';
    if (sel) { navigator.clipboard.writeText(sel); setClipboard(sel); }
    setContextMenu(null);
  };
  const handlePaste = () => {
    navigator.clipboard.readText().then(text => setClipboard(text));
    setContextMenu(null);
  };

  return (
    <div
      className="desktop-root"
      style={{ ...bgStyle, ...(isDragOver ? { outline: '3px dashed rgba(100,180,255,0.7)', outlineOffset: -4 } : {}) }}
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      {/* HASP Security Warning */}
      {haspWarning && !showSplash && (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: 'rgba(15,23,42,0.97)', border: '1.5px solid rgba(251,191,36,0.6)', borderRadius: 14, padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 480, width: 'calc(100% - 40px)', backdropFilter: 'blur(16px)' }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🔐</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 3 }}>⚠ HASP-ключ не обнаружен</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Аппаратный ключ защиты (Sentinel) не найден. Уровень безопасности снижен. Подключите HASP-ключ и перезапустите Системный конфигуратор.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button onClick={() => { openApp('sysconfig'); setHaspWarning(false); }} style={{ padding: '6px 14px', background: '#f59e0b', border: 'none', borderRadius: 8, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Открыть конфигуратор</button>
            <button onClick={() => setHaspWarning(false)} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>Игнорировать</button>
          </div>
        </div>
      )}

      <DesktopClock />
      <NotificationToast notifications={toastQueue} onDismiss={dismissToast} />
      <AIAssistantButton visible={showAIButton} onClick={() => setShowAI(s => !s)} onClose={() => { setShowAIButton(false); setShowAI(false); }} />
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInputChange} />

      {isDragOver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(50,130,200,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(20,60,120,0.85)', padding: '24px 48px', borderRadius: 12, border: '2px dashed rgba(100,180,255,0.7)', color: '#fff', fontSize: 20, textAlign: 'center' }}>
            📁 Отпустите для загрузки файла
          </div>
        </div>
      )}
      {uploading && (
        <div style={{ position: 'fixed', bottom: 50, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: 13, zIndex: 9997 }}>
          ⟳ Загрузка файла...
        </div>
      )}

      {/* Desktop icons */}
      <div className="desktop-icons-grid">
        {DESKTOP_ICONS.map((icon, i) => (
          <DesktopIcon key={i} icon={icon.icon} label={icon.label} appId={icon.appId} pngSrc={getAppIcon(icon.icon)} onDoubleClick={() => openApp(icon.appId)} />
        ))}
      </div>

      {/* Uploaded files on desktop */}
      {files.map(file => (
        <DesktopFileIcon key={file.id} file={file} onMove={moveFile} onRename={renameFile} onDelete={deleteFile} onOpen={handleOpenFile} />
      ))}

      {/* Windows */}
      {windows.map(win => (
        <Window
          key={win.id} win={win}
          isActive={win.id === activeWindowId && !win.isMinimized}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onMaximize={() => toggleMaximize(win.id)}
          onFocus={() => focusWindow(win.id)}
          onMove={(x, y) => updateWindowPosition(win.id, x, y)}
          onResize={(w, h, x, y) => updateWindowSize(win.id, w, h, x, y)}
        >
          {renderAppContent(win)}
        </Window>
      ))}

      {/* Start Menu */}
      {showStart && (
        <StartMenu
          onOpenApp={(appId) => { openApp(appId); setShowStart(false); }}
          onOpenCustomApp={handleOpenCustomApp}
          onClose={() => setShowStart(false)}
          onLogout={logout}
          isAdmin={isAdmin}
        />
      )}

      {/* Index Widget */}
      {showIndexWidget && (
        <IndexWidget onClose={() => setShowIndexWidget(false)} onOpenPortal={() => { openApp('russia'); setShowIndexWidget(false); }} />
      )}

      {/* Notification panel */}
      {showNotifications && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99990 }} onClick={() => setShowNotifications(false)} />
          <div style={{ position: 'fixed', bottom: 44, right: 8, width: 320, maxHeight: 400, background: 'rgba(15,35,75,0.97)', border: '1px solid rgba(100,160,220,0.5)', borderRadius: '8px 8px 0 0', overflow: 'hidden', zIndex: 99991, display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '10px 16px', background: 'rgba(20,60,140,0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(100,160,220,0.3)' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>🔔 Уведомления ({unreadCount})</span>
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 11, cursor: 'pointer' }}>Прочитать все</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Нет уведомлений</div>
              ) : notifications.map(n => (
                <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: n.is_read ? 'none' : 'rgba(59,130,246,0.1)', display: 'flex', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : '#3b82f6', marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{n.body}</div>}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{new Date(n.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: Math.min(contextMenu.y, window.innerHeight - 220) }} onClick={e => e.stopPropagation()}>
          <button className="context-menu-item" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={icCtxCopy} width={16} height={16} style={{ display: 'block' }} /> Копировать</button>
          <button className="context-menu-item" onClick={handlePaste} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={icCtxPaste} width={16} height={16} style={{ display: 'block' }} /> Вставить</button>
          <div style={{ height: 1, background: '#ccc', margin: '2px 8px' }} />
          <button className="context-menu-item" onClick={() => setContextMenu(null)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={icCtxProps} width={16} height={16} style={{ display: 'block' }} /> Свойства</button>
          <button className="context-menu-item" onClick={() => { fileInputRef.current?.click(); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={icTrayUpload} width={16} height={16} style={{ display: 'block' }} /> Загрузка файла</button>
          <div style={{ height: 1, background: '#ccc', margin: '2px 8px' }} />
          <button className="context-menu-item" onClick={() => { openApp('settings'); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚙️ Персонализация</button>
          <button className="context-menu-item" onClick={() => { openApp('appstore'); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🏪 Магазин приложений</button>
          {isAdmin && <button className="context-menu-item" onClick={() => { openApp('admin'); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🛡️ Администрирование</button>}
        </div>
      )}

      <Taskbar
        windows={windows}
        onWindowClick={handleTaskbarWindowClick}
        onStartClick={() => setShowStart(s => !s)}
        showStart={showStart}
        activeWindowId={activeWindowId}
        onUploadFile={() => fileInputRef.current?.click()}
        onLogout={async () => { const { supabase } = await import('@/lib/supabase'); await supabase.auth.signOut(); logout(); }}
        userName={user?.username}
        unreadCount={unreadCount}
        onNotificationClick={(e) => { e.stopPropagation(); setShowNotifications(s => !s); }}
        onIndexWidgetClick={(e) => { e.stopPropagation(); setShowIndexWidget(s => !s); }}
        haspStatus={haspStatus}
        onOpenPassport={() => openApp('passport')}
        onHaspClick={(e) => {
          e.stopPropagation();
          openApp('sysconfig');
          setTimeout(() => window.dispatchEvent(new CustomEvent('chaika-sysconfig-tab', { detail: { tab: 'hasp' } })), 400);
        }}
      />
    </div>
  );
}
