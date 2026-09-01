/**
 * Чайка ОС — Таймер Помодоро
 * Техника помодоро: 25 мин работы / 5 мин отдых
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

type Mode = 'work' | 'short_break' | 'long_break';

const MODES: Record<Mode, { label: string; minutes: number; color: string; bg: string }> = {
  work:        { label: '🍅 Работа',         minutes: 25, color: '#ef4444', bg: 'linear-gradient(135deg,#7f1d1d,#991b1b)' },
  short_break: { label: '☕ Короткий отдых', minutes: 5,  color: '#22c55e', bg: 'linear-gradient(135deg,#14532d,#166534)' },
  long_break:  { label: '🌴 Длинный отдых',  minutes: 15, color: '#3b82f6', bg: 'linear-gradient(135deg,#1e3a5f,#1565c0)' },
};

interface Task { id: number; text: string; done: boolean; pomodoros: number; }

function playSound(type: 'start' | 'end') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = type === 'end' ? [523, 659, 784] : [440, 523];
    freqs.forEach((f, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {}
}

export default function Pomodoro() {
  const [mode, setMode]                 = useState<Mode>('work');
  const [seconds, setSeconds]           = useState(MODES.work.minutes * 60);
  const [running, setRunning]           = useState(false);
  const [sessions, setSessions]         = useState(0);
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [newTask, setNewTask]           = useState('');
  const [activeTask, setActiveTask]     = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<Record<Mode, number>>({
    work: 25, short_break: 5, long_break: 15,
  });
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setSeconds(customMinutes[mode] * 60);
    setRunning(false);
  }, [mode, customMinutes]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            playSound('end');
            if (mode === 'work') {
              setSessions(n => n + 1);
              if (activeTask !== null) {
                setTasks(ts => ts.map(t => t.id === activeTask ? { ...t, pomodoros: t.pomodoros + 1 } : t));
              }
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, mode, activeTask]);

  const toggle = () => {
    if (!running) playSound('start');
    setRunning(r => !r);
  };

  const reset = () => { setRunning(false); setSeconds(customMinutes[mode] * 60); };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(ts => [...ts, { id: Date.now(), text: newTask.trim(), done: false, pomodoros: 0 }]);
    setNewTask('');
  };

  const toggleTask = (id: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const cfg = MODES[mode];
  const totalSec = customMinutes[mode] * 60;
  const pct = 1 - seconds / totalSec;
  const mm  = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss  = (seconds % 60).toString().padStart(2, '0');
  const R   = 80, C = 2 * Math.PI * R;

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden' }}>
      {/* Left — timer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: cfg.bg, transition: 'background 0.5s', color: '#fff', overflow: 'hidden' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', padding: '14px 16px 0', gap: 6, flexShrink: 0 }}>
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '7px 6px', background: mode === m ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === m ? 700 : 400, transition: 'all 0.15s' }}>
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
          <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 24 }}>
            <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={100} cy={100} r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={10} />
              <circle cx={100} cy={100} r={R} fill="none" stroke="#fff" strokeWidth={10}
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{cfg.label}</div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={reset} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 16, cursor: 'pointer' }}>⟳</button>
            <button onClick={toggle} style={{ width: 68, height: 68, borderRadius: '50%', background: '#fff', border: 'none', color: cfg.color, fontSize: 26, cursor: 'pointer', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {running ? '⏸' : '▶'}
            </button>
            <button onClick={() => setShowSettings(s => !s)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 16, cursor: 'pointer' }}>⚙️</button>
          </div>

          {/* Sessions */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Сессии сегодня</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {Array.from({ length: Math.max(sessions, 4) }, (_, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < sessions ? '#fff' : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{sessions}</div>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.7)' }}>Настройки таймера (минуты)</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(Object.keys(MODES) as Mode[]).map(m => (
                <div key={m} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{MODES[m].label.split(' ')[1] || MODES[m].label}</div>
                  <input type="number" min={1} max={60} value={customMinutes[m]}
                    onChange={e => setCustomMinutes(prev => ({ ...prev, [m]: Math.max(1, Math.min(60, parseInt(e.target.value) || 25)) }))}
                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, textAlign: 'center', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right — tasks */}
      <div style={{ width: 260, background: '#0f172a', borderLeft: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 10 }}>📋 Задачи</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
              placeholder="Новая задача..." style={{ flex: 1, padding: '7px 10px', background: '#0a1628', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={addTask} style={{ padding: '7px 10px', background: '#1565c0', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 }}>Добавьте задачи<br />для отслеживания</div>
          )}
          {tasks.map(t => (
            <div key={t.id} onClick={() => setActiveTask(activeTask === t.id ? null : t.id)}
              style={{ background: activeTask === t.id ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.03)', border: activeTask === t.id ? '1px solid #1565c0' : '1px solid #1e3a5f', borderRadius: 10, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={t.done} onChange={e => { e.stopPropagation(); toggleTask(t.id); }}
                  style={{ cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: t.done ? '#475569' : '#e2e8f0', textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{t.text}</span>
                {t.pomodoros > 0 && (
                  <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '1px 5px', flexShrink: 0 }}>🍅 {t.pomodoros}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {activeTask !== null && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid #1e3a5f', background: 'rgba(21,101,192,0.1)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#60a5fa' }}>🎯 Активная задача:</div>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, marginTop: 2 }}>{tasks.find(t => t.id === activeTask)?.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
