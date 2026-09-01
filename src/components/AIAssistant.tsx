import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import icMic from '@/assets/icons/ai-mic.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  onClose: () => void;
}

const SUGGESTED = [
  'Как отправить сообщение в Чайка Мессенджер?',
  'Как создать документ Word?',
  'Что такое Агроиндекс?',
  'Как загрузить файл на рабочий стол?',
  'Как найти пользователя по ID?',
];

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function AIAssistant({ onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я ИИ-помощник операционной системы Чайка v29. Могу объяснить как пользоваться любым приложением, найти информацию или помочь с анализом данных. Спрашивайте!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 440, y: 60 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const nx = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x));
        const ny = Math.max(0, Math.min(window.innerHeight - 500, e.clientY - dragOffset.y));
        setPos({ x: nx, y: ny });
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, dragOffset]);

  // Voice input
  const startVoiceInput = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setInput(prev => prev + ' [Голосовой ввод не поддерживается браузером]');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev + ' ' + transcript).trim());
      setIsRecording(false);
      // Auto-send after short delay
      setTimeout(() => {
        const text = (input + ' ' + transcript).trim();
        if (text) sendMessage(text);
      }, 400);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }, [isRecording, input]);

  const sendMessage = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            stream: true,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Ошибка подключения. Попробуйте ещё раз.' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Привет! Я ИИ-помощник операционной системы Чайка v29. Могу объяснить как пользоваться любым приложением, найти информацию или помочь с анализом данных. Спрашивайте!' }]);
  };

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: 400, height: 580, zIndex: 999990,
        display: 'flex', flexDirection: 'column',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(100,180,255,0.3)',
        background: 'linear-gradient(180deg, rgba(8,18,50,0.98) 0%, rgba(6,14,40,0.99) 100%)',
        border: '1px solid rgba(100,180,255,0.35)',
        backdropFilter: 'blur(24px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Title bar */}
      <div onMouseDown={handleMouseDown} style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(25,70,180,0.96), rgba(15,50,140,0.96))',
        borderBottom: '1px solid rgba(100,180,255,0.25)',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, flexShrink: 0,
          boxShadow: '0 0 14px rgba(59,130,246,0.8)',
          animation: 'ai-pulse 2s ease-in-out infinite',
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>ИИ-Помощник</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Чайка ОС v29 • Shift+F1</div>
        </div>
        <button onClick={clearChat}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', borderRadius: 6, padding: '4px 8px' }}
          title="Очистить чат">🗑</button>
        <button onClick={onClose}
          style={{ width: 26, height: 26, background: 'rgba(220,50,50,0.8)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,50,50,1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,50,50,0.8)')}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginRight: 6, flexShrink: 0, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '82%', padding: '9px 13px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, lineHeight: 1.55,
              wordBreak: 'break-word',
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content || (loading && i === messages.length - 1 ? (
                <span style={{ opacity: 0.5 }}>
                  <span style={{ animation: 'dot-blink 1.2s infinite' }}>●</span>
                  <span style={{ animation: 'dot-blink 1.2s 0.4s infinite' }}>●</span>
                  <span style={{ animation: 'dot-blink 1.2s 0.8s infinite' }}>●</span>
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested */}
      {messages.length === 1 && (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 20, color: '#93c5fd', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, background: 'rgba(0,0,0,0.35)', flexShrink: 0, alignItems: 'center' }}>
        {/* Voice button */}
        <button onClick={startVoiceInput}
          title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: isRecording
              ? 'radial-gradient(circle, #ef4444, #b91c1c)'
              : 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording ? '0 0 0 3px rgba(239,68,68,0.4), 0 0 16px rgba(239,68,68,0.6)' : 'none',
            animation: isRecording ? 'mic-pulse 1s ease-in-out infinite' : 'none',
            transition: 'all 0.2s',
          }}>
          <img src={icMic} width={18} height={18} style={{ display: 'block', filter: isRecording ? 'brightness(2)' : 'brightness(1)' }} />
        </button>

        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? '🎙 Говорите...' : 'Спросите что-нибудь...'}
          disabled={loading}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '8px 14px', color: '#fff', fontSize: 13, outline: 'none',
            fontFamily: 'Segoe UI, sans-serif',
          }}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: loading || !input.trim() ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none', color: '#fff', fontSize: 16,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
          {loading ? '⟳' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.7); }
          50% { box-shadow: 0 0 24px rgba(139,92,246,0.9), 0 0 44px rgba(59,130,246,0.4); }
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.4), 0 0 16px rgba(239,68,68,0.6); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 0 30px rgba(239,68,68,0.8); }
        }
        @keyframes dot-blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
