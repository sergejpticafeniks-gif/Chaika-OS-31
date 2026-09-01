import { useState, useCallback, useRef } from 'react';
import { AppWindow, AppDefinition } from '@/types';
import { APPS } from '@/constants/apps';

let globalZIndex = 100;

export function useWindowManager() {
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const windowCountRef = useRef(0);

  const openApp = useCallback((appId: string, overrideConfig?: Partial<Pick<AppDefinition, 'title' | 'icon' | 'defaultWidth' | 'defaultHeight' | 'minWidth' | 'minHeight'>> & { customUrl?: string; customLogoUrl?: string }) => {
    const baseApp = APPS.find(a => a.id === appId);
    const app = baseApp
      ? { ...baseApp, ...overrideConfig }
      : overrideConfig
        ? { id: appId, title: overrideConfig.title || appId, icon: overrideConfig.icon || '🌐', description: '', defaultWidth: overrideConfig.defaultWidth || 900, defaultHeight: overrideConfig.defaultHeight || 650, minWidth: overrideConfig.minWidth || 400, minHeight: overrideConfig.minHeight || 300 }
        : null;

    if (!app) return;

    // For custom apps, allow multiple instances; for built-in, bring to front
    setWindows(prev => {
      if (!appId.startsWith('custom_')) {
        const existing = prev.find(w => w.appId === appId && !w.isMinimized);
        if (existing) {
          globalZIndex++;
          return prev.map(w => w.id === existing.id ? { ...w, zIndex: globalZIndex, isMinimized: false } : w);
        }
      }

      windowCountRef.current++;
      const offset = (windowCountRef.current % 8) * 30;
      globalZIndex++;

      const newWindow: AppWindow = {
        id: `${appId}-${Date.now()}`,
        appId,
        title: app.title,
        icon: app.icon,
        x: 80 + offset,
        y: 60 + offset,
        width: app.defaultWidth,
        height: app.defaultHeight,
        minWidth: app.minWidth,
        minHeight: app.minHeight,
        isMinimized: false,
        isMaximized: false,
        zIndex: globalZIndex,
        customUrl: overrideConfig?.customUrl,
        customLogoUrl: overrideConfig?.customLogoUrl,
      };

      return [...prev, newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      if (w.isMaximized) {
        return {
          ...w,
          isMaximized: false,
          x: w.prevState?.x ?? w.x,
          y: w.prevState?.y ?? w.y,
          width: w.prevState?.width ?? w.width,
          height: w.prevState?.height ?? w.height,
          prevState: undefined,
        };
      } else {
        return {
          ...w,
          isMaximized: true,
          prevState: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight - 40,
        };
      }
    }));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (!win) return prev;
      globalZIndex++;
      return prev.map(w => w.id === id ? { ...w, zIndex: globalZIndex, isMinimized: false } : w);
    });
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  }, []);

  const updateWindowSize = useCallback((id: string, width: number, height: number, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, width, height, x, y } : w));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows(prev => {
      globalZIndex++;
      return prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: globalZIndex } : w);
    });
  }, []);

  return {
    windows,
    openApp,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    restoreWindow,
  };
}
