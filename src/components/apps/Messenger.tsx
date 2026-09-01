/**
 * Чайка Мессенджер v4 — Telegram-стиль
 * Овальные пузыри сообщений, Создание канала + группы, автообновление
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

import icMessenger from '@/assets/icons/messenger.png';
import icSend from '@/assets/icons/msg-send.png';
import icVoice from '@/assets/icons/msg-voice.png';
import icAttach from '@/assets/icons/msg-attach.png';
import icSearch from '@/assets/icons/msg-search.png';
import icChannel from '@/assets/icons/msg-channel.png';
import icGroup from '@/assets/icons/msg-group.png';
import icUser from '@/assets/icons/msg-user.png';
import emHeart from '@/assets/emoji/heart.png';
import emThumbsup from '@/assets/emoji/thumbsup.png';
import emLaugh from '@/assets/emoji/laugh.png';
import emFire from '@/assets/emoji/fire.png';
import emAngry from '@/assets/emoji/angry.png';
import emCry from '@/assets/emoji/cry.png';
import emSurprised from '@/assets/emoji/surprised.png';
import emClap from '@/assets/emoji/clap.png';

const CHAIKA_URL = 'https://vfnxvdwywfugrjqavfnx.backend.onspace.ai';
const CHAIKA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjIwOTUwMTk4MjgsImlzcyI6Im9uc3BhY2UiLCJyZWYiOiJ2Zm54dmR3eXdmdWdyanFhdmZueCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc5NjU5ODI4fQ.8gz-iWb_HV5dmYChnk1Fnea-MFwhZh0AR-JDIgJwWjM';

const db = createClient(CHAIKA_URL, CHAIKA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const REACTIONS = [
  { key: 'heart',     img: emHeart,     emoji: '❤️' },
  { key: 'thumbsup',  img: emThumbsup,  emoji: '👍' },
  { key: 'laugh',     img: emLaugh,     emoji: '😂' },
  { key: 'fire',      img: emFire,      emoji: '🔥' },
  { key: 'angry',     img: emAngry,     emoji: '😡' },
  { key: 'cry',       img: emCry,       emoji: '😢' },
  { key: 'surprised', img: emSurprised, emoji: '😮' },
  { key: 'clap',      img: emClap,      emoji: '👏' },
];

// ─── Audio notification ───────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

function sendOsNotification(title: string, body: string, chatId?: string) {
  window.dispatchEvent(new CustomEvent('chaika-messenger-notification', { detail: { title, body, chatId, type: 'messenger' } }));
}

let browserNotifGranted = false;
async function requestBrowserNotif() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { browserNotifGranted = true; return; }
  if (Notification.permission !== 'denied') browserNotifGranted = (await Notification.requestPermission()) === 'granted';
}
function showBrowserNotif(title: string, body: string) {
  if (!browserNotifGranted) return;
  new Notification(title, { body, icon: '/favicon.ico', tag: 'chaika-msg' });
}

// ─── Types ────────────────────────────────────────────────────
interface AuthUser { id: string; email: string; username?: string; }
interface Chat {
  id: string; type: 'direct'|'group'|'channel'|'shop';
  name: string; username?: string; description?: string;
  avatar_color?: string; avatar_url?: string;
  subscriber_count?: number; verified?: boolean; is_public?: boolean;
  updated_at?: string; owner_id?: string;
}
interface Message {
  id: string; chat_id: string; sender_id?: string;
  type: 'text'|'audio'|'image'|'file'|'post'|'bot';
  text?: string; image_url?: string; file_name?: string;
  file_url?: string; audio_duration?: number; audio_waveform?: number[]|null;
  reply_to?: string; forwarded?: boolean; forwarded_from?: string;
  pinned?: boolean; edited?: boolean; is_deleted?: boolean;
  created_at: string; sender_name?: string;
  reactions?: Record<string, number>;
}
interface ChannelPost {
  id: string; chat_id: string; title?: string; content: string;
  image_url?: string; views?: number; source_url?: string; created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function avatarBg(name: string, c?: string) {
  if (c?.startsWith('#')) return c;
  const colors = ['#7c3aed','#2563eb','#059669','#dc2626','#d97706','#0891b2','#be185d','#4f46e5','#0d9488'];
  let h = 0; for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return colors[Math.abs(h)%colors.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():name.slice(0,2).toUpperCase();
}
function fmtTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString()===now.toDateString()) return d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  if (now.getTime()-d.getTime()<7*86400000) return d.toLocaleDateString('ru-RU',{weekday:'short'});
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'});
}
function fmtDur(s: number) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, url, color, size=40, verified=false, online=false }: { name:string; url?:string; color?:string; size?:number; verified?:boolean; online?:boolean }) {
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      {url ? <img src={url} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} onError={e=>(e.currentTarget.style.display='none')} /> : (
        <div style={{ width:size, height:size, borderRadius:'50%', background:avatarBg(name,color), display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color:'#fff' }}>{initials(name)}</div>
      )}
      {verified && <div style={{ position:'absolute', bottom:-1, right:-1, width:Math.max(12,size*0.3), height:Math.max(12,size*0.3), background:'#7c3aed', borderRadius:'50%', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.18, color:'#fff' }}>✓</div>}
      {online && !verified && <div style={{ position:'absolute', bottom:0, right:0, width:Math.max(10,size*0.28), height:Math.max(10,size*0.28), background:'#22c55e', borderRadius:'50%', border:'2px solid #fff' }} />}
    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────
function AudioPlayer({ url, duration, waveform, isMine }: { url:string; duration?:number; waveform?:number[]|null; isMine:boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = waveform?.length ? waveform : Array.from({length:30}, (_,i)=>20+Math.sin(i*0.8)*40+Math.random()*40);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:180, maxWidth:260 }}>
      <audio ref={audioRef} src={url}
        onTimeUpdate={()=>{ if(audioRef.current){ setCurrentTime(audioRef.current.currentTime); setProgress(audioRef.current.currentTime/(audioRef.current.duration||1)*100); }}}
        onEnded={()=>{ setPlaying(false); setProgress(0); setCurrentTime(0); }} />
      <button onClick={toggle} style={{ width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer', background:isMine?'rgba(255,255,255,0.25)':'rgba(124,58,237,0.12)', color:isMine?'#fff':'#7c3aed', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {playing?'⏸':'▶'}
      </button>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', gap:1, height:26, alignItems:'center' }}>
          {bars.map((h,i)=>(
            <div key={i} style={{ flex:1, height:`${Math.max(15,Math.min(100,h))}%`, borderRadius:3,
              background: i/bars.length < progress/100 ? (isMine?'rgba(255,255,255,0.9)':'#7c3aed') : (isMine?'rgba(255,255,255,0.35)':'#ddd6fe') }} />
          ))}
        </div>
        <div style={{ fontSize:10, color:isMine?'rgba(255,255,255,0.65)':'#94a3b8', marginTop:2 }}>
          {fmtDur(Math.floor(currentTime))} / {fmtDur(duration||0)}
        </div>
      </div>
    </div>
  );
}

// ─── Reaction Picker ──────────────────────────────────────────
function ReactionPicker({ onPick, onClose }: { onPick:(key:string)=>void; onClose:()=>void }) {
  return (
    <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:24, padding:'8px 10px', display:'flex', gap:4, zIndex:200, boxShadow:'0 8px 28px rgba(0,0,0,0.18)', backdropFilter:'blur(12px)' }}>
      {REACTIONS.map(r=>(
        <button key={r.key} onClick={()=>{ onPick(r.key); onClose(); }} title={r.emoji}
          style={{ width:34, height:34, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:4, transition:'all 0.12s' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.transform='scale(1.3)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.transform='scale(1)'; }}>
          <img src={r.img} alt={r.emoji} style={{ width:22, height:22 }} />
        </button>
      ))}
    </div>
  );
}

// ─── Message Bubble (Telegram oval style) ─────────────────────
function Bubble({ msg, isMine, senderName, onReply, onReact, allMessages }: {
  msg: Message; isMine: boolean; senderName?: string;
  onReply: (msg: Message)=>void;
  onReact: (msgId: string, key: string)=>void;
  allMessages: Message[];
}) {
  const [showCtx, setShowCtx] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const ctxRef = useRef<HTMLDivElement>(null);
  const replyMsg = msg.reply_to ? allMessages.find(m=>m.id===msg.reply_to) : null;

  useEffect(()=>{
    if (!showCtx) return;
    const h = (e: MouseEvent) => { if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setShowCtx(false); };
    document.addEventListener('mousedown', h); return ()=>document.removeEventListener('mousedown', h);
  }, [showCtx]);

  if (msg.is_deleted) return (
    <div style={{ display:'flex', justifyContent:isMine?'flex-end':'flex-start', margin:'2px 16px' }}>
      <div style={{ padding:'6px 14px', borderRadius:18, background:'#f0f0f0', color:'#94a3b8', fontSize:12, fontStyle:'italic' }}>🗑 Удалено</div>
    </div>
  );

  // Telegram-style: mine = purple gradient, their = white card
  const bubbleBg = isMine
    ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
    : '#fff';
  const bubbleShadow = isMine
    ? '0 2px 12px rgba(109,40,217,0.35)'
    : '0 1px 6px rgba(0,0,0,0.08)';
  const textColor = isMine ? '#fff' : '#1e293b';

  return (
    <div style={{ display:'flex', justifyContent:isMine?'flex-end':'flex-start', margin:'2px 12px 2px 12px', alignItems:'flex-end', gap:6 }}
      onContextMenu={e=>{ e.preventDefault(); setShowCtx(true); }}>
      {!isMine && <Avatar name={senderName||'?'} size={28} />}
      <div style={{ maxWidth:'66%', minWidth:0, position:'relative' }}>
        {!isMine && senderName && (
          <div style={{ fontSize:11, fontWeight:700, color:avatarBg(senderName), marginBottom:2, paddingLeft:14 }}>{senderName}</div>
        )}
        {/* Main bubble — Telegram oval shape */}
        <div style={{
          padding: msg.type==='image' ? 3 : '9px 14px',
          borderRadius: isMine ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
          background: bubbleBg,
          color: textColor,
          fontSize: 14, lineHeight: 1.55,
          boxShadow: bubbleShadow,
          wordBreak: 'break-word',
          border: isMine ? 'none' : '1px solid #f0f0f0',
          position: 'relative', cursor: 'context-menu',
          transition: 'opacity 0.1s',
        }}>
          {replyMsg && (
            <div style={{ borderLeft:`3px solid ${isMine?'rgba(255,255,255,0.5)':'#7c3aed'}`, paddingLeft:8, marginBottom:8, borderRadius:2 }}>
              <div style={{ fontSize:11, fontWeight:700, color:isMine?'rgba(255,255,255,0.8)':'#7c3aed' }}>↩ Ответ</div>
              <div style={{ fontSize:12, color:isMine?'rgba(255,255,255,0.7)':'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{replyMsg.text||'[медиа]'}</div>
            </div>
          )}
          {msg.forwarded && <div style={{ fontSize:11, color:isMine?'rgba(255,255,255,0.7)':'#7c3aed', marginBottom:4 }}>↪ Переслано{msg.forwarded_from?` от ${msg.forwarded_from}`:''}</div>}
          {msg.type==='text' && <span style={{ whiteSpace:'pre-wrap' }}>{msg.text}</span>}
          {msg.type==='image' && msg.image_url && <img src={msg.image_url} alt="" style={{ maxWidth:240, maxHeight:200, borderRadius:16, display:'block' }} />}
          {msg.type==='audio' && msg.file_url && <AudioPlayer url={msg.file_url} duration={msg.audio_duration} waveform={msg.audio_waveform} isMine={isMine} />}
          {msg.type==='file' && msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ color:isMine?'#e9d5ff':'#7c3aed', display:'flex', alignItems:'center', gap:8, textDecoration:'none', fontSize:13 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:isMine?'rgba(255,255,255,0.15)':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📎</div>
              <div><div style={{ fontWeight:600 }}>{msg.file_name||'Файл'}</div><div style={{ fontSize:11, opacity:0.7 }}>Скачать</div></div>
            </a>
          )}
          {/* Timestamp inside bubble */}
          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:4, marginTop:msg.type==='image'?0:4, opacity:0.7 }}>
            <span style={{ fontSize:10, color:isMine?'rgba(255,255,255,0.7)':'#94a3b8' }}>{fmtTime(msg.created_at)}</span>
            {isMine && <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>✓✓</span>}
            {msg.edited && <span style={{ fontSize:10, color:isMine?'rgba(255,255,255,0.6)':'#94a3b8' }}>изм.</span>}
          </div>
        </div>

        {/* Emoji reactions */}
        {msg.reactions && Object.entries(msg.reactions).filter(([,v])=>v>0).length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:4, justifyContent:isMine?'flex-end':'flex-start' }}>
            {Object.entries(msg.reactions).filter(([,v])=>v>0).map(([key,count])=>{
              const r = REACTIONS.find(x=>x.key===key);
              if (!r) return null;
              return (
                <button key={key} onClick={()=>onReact(msg.id,key)}
                  style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:20, border:'1px solid #e8e0ff', background:'#f5f3ff', cursor:'pointer', fontSize:11, fontWeight:700, color:'#7c3aed', transition:'all 0.1s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='#ede9fe'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='#f5f3ff'; }}>
                  <img src={r.img} alt={r.emoji} style={{ width:13, height:13 }} /> {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Context menu */}
        {showCtx && (
          <div ref={ctxRef} style={{ position:'absolute', bottom:'calc(100% + 4px)', left:isMine?'auto':'0', right:isMine?'0':'auto', background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, boxShadow:'0 8px 28px rgba(0,0,0,0.15)', zIndex:200, minWidth:160, overflow:'hidden' }}>
            <button onClick={()=>{ setShowReact(true); setShowCtx(false); }} style={{ width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#1e293b', fontFamily:'inherit', textAlign:'left' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='none'}><img src={emHeart} style={{ width:18, height:18 }} /> Реакция</button>
            <button onClick={()=>{ onReply(msg); setShowCtx(false); }} style={{ width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#1e293b', fontFamily:'inherit', textAlign:'left' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='none'}>↩ Ответить</button>
            {msg.text && <button onClick={()=>{ navigator.clipboard.writeText(msg.text||''); setShowCtx(false); }} style={{ width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#1e293b', fontFamily:'inherit', textAlign:'left' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='none'}>📋 Копировать</button>}
          </div>
        )}
        {showReact && (
          <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:isMine?'auto':'0', right:isMine?'0':'auto', zIndex:200 }}>
            <ReactionPicker onPick={key=>onReact(msg.id,key)} onClose={()=>setShowReact(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────
function VoiceRecorder({ onSend }: { onSend:(blob:Blob,dur:number)=>void }) {
  const [recording, setRecording] = useState(false);
  const [dur, setDur] = useState(0);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const startTime = useRef(0);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t=>t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onSend(blob, Math.floor((Date.now()-startTime.current)/1000));
        setRecording(false); setDur(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start(); mrRef.current = mr; setRecording(true);
      startTime.current = Date.now();
      timerRef.current = setInterval(()=>setDur(d=>d+1), 1000);
    } catch { alert('Нет доступа к микрофону'); }
  };
  const stop = () => { mrRef.current?.stop(); if(timerRef.current) clearInterval(timerRef.current); };

  return (
    <button onClick={recording?stop:start} title={recording?`Стоп (${fmtDur(dur)})`:'Голосовое'}
      style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s',
        background:recording?'#dc2626':'#f1f5f9',
        boxShadow:recording?'0 0 0 8px rgba(220,38,38,0.2)':'none',
        animation:recording?'voicePulse 0.8s ease-in-out infinite alternate':'none' }}>
      <img src={icVoice} alt="voice" style={{ width:20, height:20 }} />
    </button>
  );
}

// ─── Chat Input ───────────────────────────────────────────────
function ChatInput({ chatId, userId, onSent, replyTo, onCancelReply }: { chatId:string; userId:string; onSent:()=>void; replyTo:Message|null; onCancelReply:()=>void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const send = async (t: string) => {
    if (!t.trim()||sending) return;
    setSending(true);
    const p: any = { chat_id:chatId, sender_id:userId, type:'text', text:t.trim() };
    if (replyTo) p.reply_to = replyTo.id;
    await db.from('messages').insert(p);
    setText(''); setSending(false); onSent(); onCancelReply();
    textRef.current?.focus();
  };

  const sendVoice = async (blob: Blob, dur: number) => {
    const fn = `voice_${userId}_${Date.now()}.webm`;
    const { data, error } = await db.storage.from('voice-messages').upload(fn, blob, { upsert:true });
    if (!error&&data) {
      const { data:{ publicUrl } } = db.storage.from('voice-messages').getPublicUrl(fn);
      const p: any = { chat_id:chatId, sender_id:userId, type:'audio', file_url:publicUrl, audio_duration:dur };
      if (replyTo) p.reply_to = replyTo.id;
      await db.from('messages').insert(p);
      onSent(); onCancelReply();
    }
  };

  const sendFile = async (file: File) => {
    const isImg = file.type.startsWith('image/');
    const fn = `files/${chatId}/${Date.now()}_${file.name}`;
    const { data, error } = await db.storage.from('voice-messages').upload(fn, file, { upsert:true });
    if (!error&&data) {
      const { data:{ publicUrl } } = db.storage.from('voice-messages').getPublicUrl(fn);
      const p: any = { chat_id:chatId, sender_id:userId, type:isImg?'image':'file', [isImg?'image_url':'file_url']:publicUrl, file_name:file.name };
      if (replyTo) p.reply_to = replyTo.id;
      await db.from('messages').insert(p);
      onSent(); onCancelReply();
    }
  };

  return (
    <div style={{ background:'#fff', borderTop:'1px solid #f0f0f0', flexShrink:0, boxShadow:'0 -2px 10px rgba(0,0,0,0.04)' }}>
      {replyTo && (
        <div style={{ padding:'8px 16px', background:'#faf8ff', borderTop:'2px solid #ede9fe', display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ width:3, background:'#7c3aed', borderRadius:3, alignSelf:'stretch', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed' }}>↩ Ответ</div>
            <div style={{ fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.text||'[медиа]'}</div>
          </div>
          <button onClick={onCancelReply} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:18, lineHeight:1 }}>✕</button>
        </div>
      )}
      <div style={{ padding:'10px 12px', display:'flex', gap:8, alignItems:'flex-end' }}>
        <button onClick={()=>fileRef.current?.click()} style={{ width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
          <img src={icAttach} alt="" style={{ width:18, height:18 }} />
        </button>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f) sendFile(f); e.target.value=''; }} />
        <div style={{ flex:1, background:'#f8fafc', border:'1.5px solid #e8e8f0', borderRadius:24, padding:'9px 16px', transition:'border-color 0.15s' }}
          onFocusCapture={e=>e.currentTarget.style.borderColor='#c4b5fd'}
          onBlurCapture={e=>e.currentTarget.style.borderColor='#e8e8f0'}>
          <textarea ref={textRef} value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(text); }}}
            placeholder="Написать сообщение..." rows={1}
            style={{ flex:1, border:'none', outline:'none', background:'none', color:'#1e293b', fontSize:14, resize:'none', fontFamily:'inherit', maxHeight:80, overflowY:'auto', lineHeight:1.5, width:'100%' }} />
        </div>
        <VoiceRecorder onSend={sendVoice} />
        <button onClick={()=>send(text)} disabled={!text.trim()||sending}
          style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:text.trim()&&!sending?'pointer':'default', background:text.trim()&&!sending?'linear-gradient(135deg,#7c3aed,#6d28d9)':'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s', boxShadow:text.trim()&&!sending?'0 4px 12px rgba(124,58,237,0.4)':'none' }}>
          <img src={icSend} alt="" style={{ width:18, height:18, opacity:text.trim()&&!sending?1:0.4, filter:text.trim()&&!sending?'brightness(0) invert(1)':'none' }} />
        </button>
      </div>
    </div>
  );
}

// ─── Channel Post ─────────────────────────────────────────────
function PostCard({ post }: { post: ChannelPost }) {
  return (
    <div style={{ margin:'6px 12px', background:'#fff', borderRadius:18, border:'1px solid #f0f0f0', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
      {post.image_url && <img src={post.image_url} alt="" style={{ width:'100%', maxHeight:220, objectFit:'cover' }} onError={e=>e.currentTarget.style.display='none'} />}
      <div style={{ padding:'14px 16px' }}>
        {post.title && <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:6, lineHeight:1.4 }}>{post.title}</div>}
        <div style={{ fontSize:13, color:'#334155', lineHeight:1.65, whiteSpace:'pre-wrap' }}>{post.content}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
          <div style={{ fontSize:11, color:'#94a3b8' }}>{fmtTime(post.created_at)}</div>
          <div style={{ display:'flex', gap:8, fontSize:11, color:'#94a3b8' }}>
            {post.views ? <span>👁 {post.views}</span> : null}
            {post.source_url && <a href={post.source_url} target="_blank" rel="noopener noreferrer" style={{ color:'#7c3aed', textDecoration:'none', fontWeight:600 }}>Читать →</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Channel Modal ─────────────────────────────────────
function CreateChatModal({ userId, type, onClose, onCreated }: { userId:string; type:'channel'|'group'; onClose:()=>void; onCreated:(c:Chat)=>void }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const create = async () => {
    if (!name.trim()) { setErr('Введите название'); return; }
    setLoading(true); setErr('');
    let avatar_url = '';
    if (avatarFile) {
      const path = `${type}s/${userId}/${Date.now()}_${avatarFile.name}`;
      const { data } = await db.storage.from('voice-messages').upload(path, avatarFile, { upsert:true });
      if (data) { const { data:{ publicUrl } } = db.storage.from('voice-messages').getPublicUrl(path); avatar_url = publicUrl; }
    }
    const payload: any = { type, name: name.trim(), owner_id: userId, is_public: true, description: description.trim()||null, avatar_url: avatar_url||null };
    if (username.trim()) payload.username = username.trim().replace(/^@/,'');
    const { data: chatData, error } = await db.from('chats').insert(payload).select().single();
    if (error||!chatData) { setErr(error?.message||'Ошибка'); setLoading(false); return; }
    await db.from('chat_members').insert({ chat_id:(chatData as any).id, user_id:userId, role:'owner' });
    setLoading(false);
    onCreated(chatData as Chat);
  };

  const isChannel = type === 'channel';
  const title = isChannel ? '📢 Создать канал' : '👥 Создать группу';
  const accentColor = isChannel ? '#7c3aed' : '#059669';
  const gradient = isChannel ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#059669,#047857)';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={onClose}>
      <div style={{ width:400, background:'#fff', borderRadius:20, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', display:'flex', flexDirection:'column', gap:14 }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {title}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:20 }}>✕</button>
        </div>
        {err && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'8px 12px', fontSize:13, color:'#dc2626' }}>⚠️ {err}</div>}
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div onClick={()=>fileRef.current?.click()} style={{ width:60, height:60, borderRadius:'50%', background:'#f5f3ff', border:`2px dashed ${accentColor}40`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }}>
            {avatarPreview ? <img src={avatarPreview} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:24 }}>📷</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}} />
          <div style={{ flex:1, fontSize:12, color:'#94a3b8' }}>Нажмите для загрузки аватара</div>
        </div>
        {[
          { label:'Название *', val:name, set:setName, ph:`Название ${isChannel?'канала':'группы'}` },
          { label:'@username', val:username, set:setUsername, ph:'@handle (необязательно)' },
          { label:'Описание', val:description, set:setDescription, ph:'Краткое описание...' },
        ].map(f=>(
          <div key={f.label}>
            <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:6 }}>{f.label}</div>
            <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', color:'#1e293b', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e=>e.currentTarget.style.borderColor=accentColor} onBlur={e=>e.currentTarget.style.borderColor='#e2e8f0'} />
          </div>
        ))}
        <button onClick={create} disabled={loading||!name.trim()} style={{ padding:'13px', background:loading||!name.trim()?'#e2e8f0':gradient, border:'none', borderRadius:12, color:loading||!name.trim()?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||!name.trim()?'default':'pointer', fontFamily:'inherit' }}>
          {loading ? '⟳ Создание...' : `${isChannel?'📢 Создать канал':'👥 Создать группу'}`}
        </button>
      </div>
    </div>
  );
}

// ─── Chat View ────────────────────────────────────────────────
function ChatView({ chat, userId, onBack }: { chat: Chat; userId: string; onBack: ()=>void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelPosts, setChannelPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [replyTo, setReplyTo] = useState<Message|null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const lastCountRef = useRef(0);
  const isChannel = chat.type === 'channel';

  const loadContent = useCallback(async () => {
    if (isChannel) {
      const { data } = await db.from('channel_posts').select('*').eq('chat_id', chat.id).order('created_at', { ascending: true });
      if (data) setChannelPosts(data as ChannelPost[]);
    } else {
      const { data } = await db.from('messages').select('*, message_reactions(emoji, user_id)').eq('chat_id', chat.id).eq('is_deleted', false).order('created_at', { ascending: true });
      if (data) {
        const msgs = (data as any[]).map(m => {
          const r: Record<string,number> = {};
          (m.message_reactions||[]).forEach((rx: any) => { r[rx.emoji] = (r[rx.emoji]||0)+1; });
          return { ...m, reactions: r, message_reactions: undefined };
        });
        if (msgs.length > lastCountRef.current && lastCountRef.current > 0) {
          const newMsg = msgs[msgs.length-1];
          if (newMsg.sender_id !== userId) {
            const preview = newMsg.text?.slice(0,60) || '[медиа]';
            playNotifSound();
            showBrowserNotif(chat.name, preview);
            sendOsNotification(`💬 ${chat.name}`, preview, chat.id);
          }
        }
        lastCountRef.current = msgs.length;
        setMessages(msgs);
      }
    }
    setLoading(false);
  }, [chat.id, isChannel, userId]);

  useEffect(()=>{
    setMessages([]); setChannelPosts([]); setLoading(true); lastCountRef.current = 0;
    loadContent();
    pollRef.current = setInterval(loadContent, 2500);
    return ()=>{ if(pollRef.current) clearInterval(pollRef.current); };
  }, [loadContent]);

  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, channelPosts]);

  const handleReact = async (msgId: string, key: string) => {
    const { data: ex } = await db.from('message_reactions').select('id').eq('message_id',msgId).eq('user_id',userId).eq('emoji',key).single();
    if (ex) await db.from('message_reactions').delete().eq('id',(ex as any).id);
    else await db.from('message_reactions').insert({ message_id:msgId, user_id:userId, emoji:key });
    loadContent();
  };

  const filteredMsgs = searchQ.trim() ? messages.filter(m=>m.text?.toLowerCase().includes(searchQ.toLowerCase())) : messages;
  const filteredPosts = searchQ.trim() ? channelPosts.filter(p=>p.content.toLowerCase().includes(searchQ.toLowerCase())||p.title?.toLowerCase().includes(searchQ.toLowerCase())) : channelPosts;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8f7ff' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0, boxShadow:'0 1px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={onBack} style={{ display:'none' }} />
        <Avatar name={chat.name} url={chat.avatar_url||undefined} color={chat.avatar_color||undefined} size={42} verified={chat.verified} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:6 }}>
            {chat.name}
            {chat.verified && <span style={{ fontSize:11, background:'#7c3aed', color:'#fff', borderRadius:20, padding:'1px 6px' }}>✓</span>}
          </div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>
            {isChannel ? `${chat.subscriber_count||0} подписчиков` : chat.type==='group'?'Группа':'Личные сообщения'}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {isChannel && <button onClick={async()=>{ await db.from('chat_members').upsert({ chat_id:chat.id, user_id:userId, role:'member' }); alert('Вы подписаны!'); }} style={{ padding:'7px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:700 }}>+ Подписаться</button>}
          <button onClick={()=>setShowSearch(s=>!s)} style={{ width:36, height:36, borderRadius:10, border:'none', background:showSearch?'#ede9fe':'#f8fafc', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={icSearch} alt="" style={{ width:16, height:16, opacity:0.6 }} />
          </button>
        </div>
      </div>
      {showSearch && (
        <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'8px 16px', flexShrink:0 }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Поиск в переписке..." autoFocus
            style={{ width:'100%', padding:'8px 14px', border:'1.5px solid #c4b5fd', borderRadius:20, fontSize:13, outline:'none', background:'#faf8ff', color:'#1e293b', fontFamily:'inherit' }} />
        </div>
      )}
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', paddingTop:8, paddingBottom:8 }}>
        {loading && <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>Загрузка...</div>}
        {!loading && !isChannel && filteredMsgs.length===0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <img src={icMessenger} alt="" style={{ width:48, height:48, marginBottom:12, opacity:0.4 }} />
            <div style={{ fontSize:15, fontWeight:600 }}>Нет сообщений</div>
            <div style={{ fontSize:12, marginTop:6 }}>Начните переписку!</div>
          </div>
        )}
        {!loading && isChannel && filteredPosts.length===0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <img src={icChannel} alt="" style={{ width:48, height:48, marginBottom:12, opacity:0.4 }} />
            <div style={{ fontSize:15, fontWeight:600 }}>Нет публикаций</div>
          </div>
        )}
        {!isChannel && filteredMsgs.map(msg=>(
          <Bubble key={msg.id} msg={msg} isMine={msg.sender_id===userId}
            senderName={msg.sender_id!==userId ? (msg.sender_name||undefined) : undefined}
            onReply={setReplyTo} onReact={handleReact} allMessages={messages} />
        ))}
        {isChannel && filteredPosts.map(post=><PostCard key={post.id} post={post} />)}
        <div ref={endRef} />
      </div>
      {/* Input */}
      {!isChannel ? (
        <ChatInput chatId={chat.id} userId={userId} onSent={loadContent} replyTo={replyTo} onCancelReply={()=>setReplyTo(null)} />
      ) : (
        <div style={{ background:'#fff', borderTop:'1px solid #f0f0f0', padding:'12px 16px', textAlign:'center', color:'#94a3b8', fontSize:12, flexShrink:0 }}>
          <img src={icChannel} alt="" style={{ width:14, height:14, opacity:0.4, verticalAlign:'middle', marginRight:4 }} />
          Канал · Только чтение
        </div>
      )}
    </div>
  );
}

// ─── Discover ─────────────────────────────────────────────────
function DiscoverView({ userId, onSelectChat }: { userId: string; onSelectChat: (c: Chat)=>void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState<'channel'|'group'|null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const { data } = await db.from('chats').select('*').or(`name.ilike.%${query}%,username.ilike.%${query}%`).eq('is_public', true).limit(20);
    setResults((data as Chat[])||[]); setLoading(false);
  };

  const join = async (chat: Chat) => {
    await db.from('chat_members').upsert({ chat_id:chat.id, user_id:userId, role:'member' });
    onSelectChat(chat);
  };

  return (
    <div style={{ padding:20, height:'100%', overflowY:'auto' }}>
      {showCreate && (
        <CreateChatModal userId={userId} type={showCreate} onClose={()=>setShowCreate(null)}
          onCreated={chat=>{ setShowCreate(null); onSelectChat(chat); }} />
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#1e293b' }}>🔍 Найти</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>Каналы, группы и пользователи</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowCreate('group')}
            style={{ padding:'8px 14px', background:'linear-gradient(135deg,#059669,#047857)', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:700, boxShadow:'0 3px 8px rgba(5,150,105,0.35)' }}>
            + Группа
          </button>
          <button onClick={()=>setShowCreate('channel')}
            style={{ padding:'8px 14px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:700, boxShadow:'0 3px 8px rgba(124,58,237,0.35)' }}>
            + Канал
          </button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <div style={{ flex:1, background:'#fff', border:'1.5px solid #e8e8f0', borderRadius:14, display:'flex', alignItems:'center', padding:'0 14px', gap:8 }}
          onFocusCapture={e=>e.currentTarget.style.borderColor='#c4b5fd'} onBlurCapture={e=>e.currentTarget.style.borderColor='#e8e8f0'}>
          <img src={icSearch} alt="" style={{ width:16, height:16, opacity:0.4 }} />
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
            placeholder="Имя, @username..." style={{ flex:1, border:'none', outline:'none', background:'none', color:'#1e293b', fontSize:14, padding:'11px 0', fontFamily:'inherit' }} />
        </div>
        <button onClick={search} disabled={loading||!query.trim()} style={{ padding:'0 20px', background:loading||!query.trim()?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', color:loading||!query.trim()?'#94a3b8':'#fff', border:'none', borderRadius:14, fontSize:14, cursor:loading||!query.trim()?'default':'pointer', fontWeight:700, fontFamily:'inherit' }}>
          {loading ? '⟳' : 'Найти'}
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {results.map(chat=>(
          <div key={chat.id} style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:16, padding:'14px 16px', display:'flex', gap:12, alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', transition:'box-shadow 0.12s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(124,58,237,0.12)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'}>
            <Avatar name={chat.name} url={chat.avatar_url||undefined} color={chat.avatar_color||undefined} size={48} verified={chat.verified} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:6 }}>
                {chat.name}
                {chat.verified && <span style={{ fontSize:10, background:'#7c3aed', color:'#fff', borderRadius:20, padding:'1px 6px' }}>✓</span>}
              </div>
              {chat.username && <div style={{ fontSize:12, color:'#7c3aed', fontWeight:600 }}>@{chat.username}</div>}
              {chat.description && <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chat.description}</div>}
              <div style={{ fontSize:11, color:'#cbd5e1', marginTop:4 }}>
                {chat.type==='channel'?'📢 Канал':chat.type==='group'?'👥 Группа':'💬 Чат'}
                {chat.subscriber_count ? ` · ${chat.subscriber_count} уч.` : ''}
              </div>
            </div>
            <button onClick={()=>join(chat)} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>
              {chat.type==='channel'?'Подписаться':'Открыть'}
            </button>
          </div>
        ))}
        {results.length===0 && query && !loading && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
            <div>По запросу «{query}» ничего не найдено</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shop View ────────────────────────────────────────────────
function ShopView({ userId }: { userId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all'|'orders'|'wallet'>('all');
  const [wallet, setWallet] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(()=>{
    Promise.all([
      db.from('products').select('*').eq('in_stock',true).order('created_at',{ascending:false}).limit(40),
      db.from('wallets').select('*').eq('user_id',userId).single(),
    ]).then(([{data:p},{data:w}])=>{ setProducts(p||[]); if(w) setWallet(w); setLoading(false); });
  },[userId]);

  useEffect(()=>{
    if(tab==='wallet') db.from('wallet_transactions').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(20).then(({data})=>setTransactions(data||[]));
  },[tab,userId]);

  const topup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount||amount<=0||!wallet) return;
    await db.from('wallet_transactions').insert({ wallet_id:wallet.id, user_id:userId, type:'deposit', amount, status:'completed', description:'Пополнение' });
    await db.from('wallets').update({ balance:(wallet.balance||0)+amount }).eq('id',wallet.id);
    const {data:w} = await db.from('wallets').select('*').eq('user_id',userId).single();
    if(w) setWallet(w); setTopupAmount('');
    db.from('wallet_transactions').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(20).then(({data})=>setTransactions(data||[]));
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', padding:'16px 20px', flexShrink:0 }}>
        <div style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:4 }}>🛍 Магазин Чайка</div>
        {wallet && (
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>💳 БАЛАНС</div><div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{Number(wallet.balance||0).toFixed(2)} ₽</div></div>
            <button onClick={()=>setTab('wallet')} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:20, color:'#fff', fontSize:12, cursor:'pointer', fontWeight:700 }}>+ Пополнить</button>
          </div>
        )}
      </div>
      <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #f0f0f0', flexShrink:0 }}>
        {([['all','🛒 Товары'],['orders','📦 Заказы'],['wallet','💳 Кошелёк']] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'11px 4px', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'none', color:tab===t?'#7c3aed':'#94a3b8', borderBottom:tab===t?'2px solid #7c3aed':'2px solid transparent', fontFamily:'inherit' }}>{l}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>
        {tab==='all' && (<>
          {loading && <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Загрузка...</div>}
          {!loading && !products.length && <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}><div style={{ fontSize:40 }}>🛍</div><div>Нет товаров</div></div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
            {products.map((p:any)=>(
              <div key={p.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f0f0', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.title} style={{ width:'100%', height:120, objectFit:'cover' }} /> : <div style={{ height:100, background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🛍</div>}
                <div style={{ padding:12, flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{p.title}</div>
                  {p.description && <div style={{ fontSize:11, color:'#94a3b8', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{p.description}</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:8 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#7c3aed' }}>{p.price} {p.currency||'₽'}</div>
                    <button onClick={async()=>{ await db.from('orders').insert({ product_id:p.id, buyer_id:userId, seller_id:p.seller_id, shop_id:p.shop_id, quantity:1, total_price:p.price, currency:p.currency||'RUB', status:'pending' }); alert(`✅ Заказ «${p.title}» оформлен!`); }}
                      style={{ padding:'6px 14px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:700 }}>Купить</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}
        {tab==='wallet' && (
          <div style={{ maxWidth:480 }}>
            {wallet && (
              <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f0f0', padding:20, marginBottom:20 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:4 }}>💳 Пополнить баланс</div>
                <div style={{ fontSize:13, color:'#94a3b8', marginBottom:14 }}>Текущий: <strong style={{ color:'#7c3aed' }}>{Number(wallet.balance||0).toFixed(2)} ₽</strong></div>
                <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                  {[100,300,500,1000].map(a=>(
                    <button key={a} onClick={()=>setTopupAmount(String(a))}
                      style={{ flex:1, padding:'8px', borderRadius:10, border:`1.5px solid ${topupAmount===String(a)?'#7c3aed':'#e2e8f0'}`, background:topupAmount===String(a)?'#f5f3ff':'none', color:topupAmount===String(a)?'#7c3aed':'#64748b', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s' }}>{a}₽</button>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={topupAmount} onChange={e=>setTopupAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Сумма..." type="number"
                    style={{ flex:1, padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', color:'#1e293b' }} />
                  <button onClick={topup} disabled={!topupAmount||parseFloat(topupAmount)<=0}
                    style={{ padding:'0 20px', background:!topupAmount?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', color:!topupAmount?'#94a3b8':'#fff', border:'none', borderRadius:10, fontSize:14, cursor:!topupAmount?'default':'pointer', fontWeight:700, fontFamily:'inherit' }}>Пополнить</button>
                </div>
              </div>
            )}
            <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:12 }}>📜 История</div>
            {!transactions.length && <div style={{ textAlign:'center', padding:20, color:'#94a3b8', fontSize:13 }}>Нет транзакций</div>}
            {transactions.map((tx:any)=>(
              <div key={tx.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{tx.type==='deposit'?'Пополнение':tx.type==='payment'?'Оплата':'Транзакция'}</div>
                  {tx.description && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{tx.description}</div>}
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:tx.type==='deposit'||tx.type==='refund'?'#22c55e':'#ef4444' }}>
                  {tx.type==='deposit'||tx.type==='refund'?'+':'-'}{Number(tx.amount).toFixed(2)} ₽
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Music View ───────────────────────────────────────────────
function MusicView({ userId }: { userId: string }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [current, setCurrent] = useState<any|null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(()=>{ db.from('music_tracks').select('*').eq('is_public',true).order('plays',{ascending:false}).limit(50).then(({data})=>setTracks(data||[])); },[]);

  const play = (t: any) => {
    if (current?.id===t.id) { if(playing){ audioRef.current?.pause(); setPlaying(false); } else { audioRef.current?.play(); setPlaying(true); } }
    else { setCurrent(t); setPlaying(true); setTimeout(()=>audioRef.current?.play(), 80); }
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed,#be185d)', padding:'16px 20px', flexShrink:0 }}>
        <div style={{ fontSize:17, fontWeight:800, color:'#fff' }}>🎵 Музыка Чайка</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:2 }}>Публичная библиотека</div>
      </div>
      {current && (
        <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'12px 16px', display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
          <audio ref={audioRef} src={current.file_url}
            onTimeUpdate={()=>{ if(audioRef.current) setProgress(audioRef.current.currentTime/(audioRef.current.duration||1)*100); }}
            onEnded={()=>{ setPlaying(false); setProgress(0); }} />
          <div style={{ width:48, height:48, borderRadius:10, background:'linear-gradient(135deg,#ede9fe,#e0e7ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0, overflow:'hidden' }}>
            {current.cover_url ? <img src={current.cover_url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }} /> : '🎵'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.title}</div>
            <div style={{ fontSize:12, color:'#94a3b8' }}>{current.artist||'Неизвестный'}</div>
            <div style={{ height:3, background:'#f0f0f0', borderRadius:3, marginTop:6, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#6d28d9)', borderRadius:3, transition:'width 0.5s linear' }} />
            </div>
          </div>
          <button onClick={()=>play(current)} style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {playing?'⏸':'▶'}
          </button>
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {!tracks.length && <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}><div style={{ fontSize:40 }}>🎵</div>Нет треков</div>}
        {tracks.map((t:any,i:number)=>(
          <div key={t.id} onClick={()=>play(t)}
            style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 12px', borderRadius:12, cursor:'pointer', background:current?.id===t.id?'#f5f3ff':'none', marginBottom:2, transition:'background 0.1s' }}
            onMouseEnter={e=>{ if(current?.id!==t.id) e.currentTarget.style.background='#f8fafc'; }}
            onMouseLeave={e=>{ if(current?.id!==t.id) e.currentTarget.style.background='none'; }}>
            <div style={{ width:18, fontSize:12, color:'#94a3b8', textAlign:'center', flexShrink:0 }}>{current?.id===t.id&&playing?'🎵':i+1}</div>
            <div style={{ width:42, height:42, borderRadius:8, background:'linear-gradient(135deg,#ede9fe,#e0e7ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, overflow:'hidden' }}>
              {t.cover_url ? <img src={t.cover_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🎵'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
              <div style={{ fontSize:11, color:'#94a3b8' }}>{t.artist||'—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ userId, userName, selectedId, onSelect, activeView, onChangeView, unreadCount }: {
  userId:string; userName:string; selectedId:string|null;
  onSelect:(c:Chat)=>void; activeView:string; onChangeView:(v:string)=>void; unreadCount:number;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'direct'|'groups'|'channels'>('all');
  const prevChatsRef = useRef<Chat[]>([]);

  const loadChats = useCallback(async () => {
    const { data: members } = await db.from('chat_members').select('chat_id').eq('user_id', userId);
    if (!members?.length) { setChats([]); return; }
    const ids = (members as any[]).map(m=>m.chat_id);
    const { data } = await db.from('chats').select('*').in('id', ids).order('updated_at', { ascending:false });
    const newChats = (data as Chat[])||[];
    if (prevChatsRef.current.length > 0) {
      newChats.forEach(chat=>{
        const prev = prevChatsRef.current.find(c=>c.id===chat.id);
        if (prev && chat.updated_at && prev.updated_at && chat.updated_at > prev.updated_at) {
          sendOsNotification(`💬 Чайка: ${chat.name}`, 'Новые сообщения', chat.id);
        }
      });
    }
    prevChatsRef.current = newChats;
    setChats(newChats);
  }, [userId]);

  useEffect(()=>{
    loadChats();
    const t = setInterval(loadChats, 90000);
    const t2 = setInterval(loadChats, 4000);
    return ()=>{ clearInterval(t); clearInterval(t2); };
  }, [loadChats]);

  const filtered = chats.filter(c=>{
    const ms = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || (c.username||'').toLowerCase().includes(search.toLowerCase());
    const mf = filter==='all' || (filter==='direct'&&c.type==='direct') || (filter==='groups'&&c.type==='group') || (filter==='channels'&&(c.type==='channel'||c.type==='shop'));
    return ms && mf;
  });

  const navBtns = [
    { id:'chats', label:'Чаты', icon:'💬', badge:unreadCount },
    { id:'discover', label:'Найти', icon:<img src={icSearch} alt="" style={{ width:18,height:18 }} /> },
    { id:'shop', label:'Магазин', icon:'🛍' },
    { id:'music', label:'Музыка', icon:'🎵' },
  ];

  return (
    <div style={{ width:288, borderRight:'1px solid #f0f0f0', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0, height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #f0f0f0', flexShrink:0, background:'linear-gradient(180deg,#faf8ff 0%,#fff 100%)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <Avatar name={userName} size={38} online />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</div>
            <div style={{ fontSize:11, color:'#22c55e', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} /> онлайн
            </div>
          </div>
          <button onClick={()=>db.auth.signOut().then(()=>window.location.reload())} style={{ width:32, height:32, borderRadius:10, border:'none', background:'#f8fafc', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center' }} title="Выйти">⏻</button>
        </div>
        {/* Nav */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3 }}>
          {navBtns.map(b=>(
            <button key={b.id} onClick={()=>onChangeView(b.id)}
              style={{ padding:'7px 4px', border:'none', borderRadius:10, cursor:'pointer', fontFamily:'inherit', background:activeView===b.id?'#ede9fe':'none', transition:'all 0.12s', position:'relative' }}>
              <div style={{ fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{b.icon as any}</div>
              <div style={{ fontSize:10, fontWeight:700, color:activeView===b.id?'#7c3aed':'#94a3b8', marginTop:1 }}>{b.label}</div>
              {b.badge ? <div style={{ position:'absolute', top:4, right:4, minWidth:16, height:16, background:'#ef4444', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:800, padding:'0 4px' }}>{b.badge}</div> : null}
            </button>
          ))}
        </div>
      </div>
      {/* Search */}
      <div style={{ padding:'8px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', background:'#f5f3ff', borderRadius:20, padding:'7px 12px', gap:8 }}>
          <img src={icSearch} alt="" style={{ width:14, height:14, opacity:0.5, flexShrink:0 }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск чатов..."
            style={{ flex:1, border:'none', outline:'none', background:'none', color:'#1e293b', fontSize:13, fontFamily:'inherit' }} />
        </div>
      </div>
      {/* Filter pills */}
      <div style={{ display:'flex', gap:4, padding:'0 12px 8px', overflowX:'auto', flexShrink:0 }}>
        {([['all','Все'],['direct','Личные'],['groups','Группы'],['channels','Каналы']] as const).map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v as any)}
            style={{ padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, whiteSpace:'nowrap', background:filter===v?'#7c3aed':'#f1f5f9', color:filter===v?'#fff':'#64748b', transition:'all 0.12s', fontFamily:'inherit' }}>{l}</button>
        ))}
      </div>
      {/* Chat list */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length===0 && (
          <div style={{ textAlign:'center', padding:'40px 16px', color:'#94a3b8', fontSize:12 }}>
            <img src={icMessenger} alt="" style={{ width:40, height:40, marginBottom:10, opacity:0.3 }} />
            <div>{search ? 'Ничего не найдено' : 'Нет чатов. Используйте «Найти»'}</div>
          </div>
        )}
        {filtered.map(chat=>(
          <button key={chat.id} onClick={()=>{ onSelect(chat); onChangeView('chats'); }}
            style={{ width:'100%', padding:'11px 14px', background:selectedId===chat.id?'#f5f3ff':'none', border:'none', borderBottom:'1px solid #fafafa', cursor:'pointer', display:'flex', gap:10, alignItems:'center', textAlign:'left', transition:'background 0.1s' }}
            onMouseEnter={e=>{ if(selectedId!==chat.id) e.currentTarget.style.background='#fafafa'; }}
            onMouseLeave={e=>{ if(selectedId!==chat.id) e.currentTarget.style.background='none'; }}>
            <div style={{ position:'relative' }}>
              <Avatar name={chat.name} url={chat.avatar_url||undefined} color={chat.avatar_color||undefined} size={46} verified={chat.verified} />
              {chat.type==='channel' && <div style={{ position:'absolute', bottom:-2, right:-2, width:16, height:16, background:'#7c3aed', borderRadius:'50%', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8 }}>📢</div>}
              {chat.type==='group' && <div style={{ position:'absolute', bottom:-2, right:-2, width:16, height:16, background:'#059669', borderRadius:'50%', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8 }}>👥</div>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{chat.name}</div>
                {chat.updated_at && <div style={{ fontSize:11, color:'#94a3b8', flexShrink:0 }}>{fmtTime(chat.updated_at)}</div>}
              </div>
              <div style={{ fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {chat.username ? <span style={{ color:'#7c3aed', fontWeight:600 }}>@{chat.username}</span> : (chat.type==='channel'?'Канал':chat.type==='group'?'Группа':'Личные')}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────
function LoginView({ onAuth }: { onAuth:(u:AuthUser)=>void }) {
  const [tab, setTab] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); const [step, setStep] = useState<'creds'|'otp'|'setpass'>('creds');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(''); const [info, setInfo] = useState('');

  const login = async () => {
    setLoading(true); setErr('');
    const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error||!data.user) { setErr(error?.message||'Ошибка входа'); setLoading(false); return; }
    await requestBrowserNotif();
    onAuth({ id:data.user.id, email:data.user.email!, username:data.user.user_metadata?.username });
    setLoading(false);
  };
  const sendOtp = async () => {
    setLoading(true); setErr('');
    const { error } = await db.auth.signInWithOtp({ email: email.trim(), options:{ shouldCreateUser:true } });
    if (error) { setErr(error.message); setLoading(false); return; }
    setInfo(`Код отправлен на ${email.trim()}`); setStep('otp'); setLoading(false);
  };
  const verifyOtp = async () => {
    setLoading(true); setErr('');
    const { data, error } = await db.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type:'email' });
    if (error||!data.user) { setErr(error?.message||'Неверный код'); setLoading(false); return; }
    setStep('setpass'); setLoading(false);
  };
  const setPass = async () => {
    if (password.length<6) { setErr('Минимум 6 символов'); return; }
    setLoading(true); setErr('');
    const { data, error } = await db.auth.updateUser({ password, data:{ username:email.split('@')[0] } });
    if (error||!data.user) { setErr(error?.message||'Ошибка'); setLoading(false); return; }
    await requestBrowserNotif();
    onAuth({ id:data.user.id, email:data.user.email!, username:data.user.user_metadata?.username });
    setLoading(false);
  };

  const inp = { padding:'12px 16px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', color:'#1e293b', width:'100%', boxSizing:'border-box' as const, transition:'border-color 0.15s' };

  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#f0f0ff,#e8f0fe,#fdf0ff)' }}>
      <div style={{ width:360, background:'#fff', borderRadius:24, padding:36, boxShadow:'0 20px 60px rgba(124,58,237,0.15)', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ textAlign:'center' }}>
          <img src={icMessenger} alt="" style={{ width:64, height:64, marginBottom:8, borderRadius:18, boxShadow:'0 8px 24px rgba(124,58,237,0.3)' }} />
          <div style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>Чайка</div>
          <div style={{ fontSize:12, color:'#94a3b8', letterSpacing:3, fontWeight:700, textTransform:'uppercase' }}>Мессенджер</div>
        </div>
        <div style={{ display:'flex', background:'#f1f5f9', borderRadius:12, padding:3 }}>
          {(['login','register'] as const).map(t=>(
            <button key={t} onClick={()=>{ setTab(t); setStep('creds'); setErr(''); setInfo(''); }}
              style={{ flex:1, padding:'9px', border:'none', cursor:'pointer', borderRadius:10, fontSize:13, fontWeight:700, background:tab===t?'#7c3aed':'none', color:tab===t?'#fff':'#64748b', transition:'all 0.15s', fontFamily:'inherit', boxShadow:tab===t?'0 3px 8px rgba(124,58,237,0.4)':'none' }}>
              {t==='login'?'Войти':'Регистрация'}
            </button>
          ))}
        </div>
        {err && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#dc2626' }}>⚠️ {err}</div>}
        {info && <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#1d4ed8' }}>✉️ {info}</div>}
        {step==='creds'&&tab==='login'&&(<>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" onKeyDown={e=>e.key==='Enter'&&login()} style={inp} onFocus={e=>e.currentTarget.style.borderColor='#7c3aed'} onBlur={e=>e.currentTarget.style.borderColor='#e2e8f0'} />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" onKeyDown={e=>e.key==='Enter'&&login()} style={inp} onFocus={e=>e.currentTarget.style.borderColor='#7c3aed'} onBlur={e=>e.currentTarget.style.borderColor='#e2e8f0'} />
          <button onClick={login} disabled={loading||!email||!password} style={{ padding:'13px', background:loading||!email||!password?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', borderRadius:12, color:loading||!email||!password?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||!email||!password?'default':'pointer', fontFamily:'inherit', boxShadow:loading||!email||!password?'none':'0 4px 12px rgba(124,58,237,0.4)' }}>
            {loading?'⟳ Вход...':'Войти'}
          </button>
        </>)}
        {step==='creds'&&tab==='register'&&(<>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={inp} onFocus={e=>e.currentTarget.style.borderColor='#7c3aed'} onBlur={e=>e.currentTarget.style.borderColor='#e2e8f0'} />
          <button onClick={sendOtp} disabled={loading||!email} style={{ padding:'13px', background:loading||!email?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', borderRadius:12, color:loading||!email?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||!email?'default':'pointer', fontFamily:'inherit' }}>
            {loading?'⟳':'Получить код'}
          </button>
        </>)}
        {step==='otp'&&(<>
          <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Код из письма" maxLength={8} onKeyDown={e=>e.key==='Enter'&&verifyOtp()} style={{ ...inp, fontSize:24, textAlign:'center', letterSpacing:8 }} />
          <button onClick={verifyOtp} disabled={loading||!otp} style={{ padding:'13px', background:loading||!otp?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', borderRadius:12, color:loading||!otp?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||!otp?'default':'pointer', fontFamily:'inherit' }}>
            {loading?'⟳':'Подтвердить'}
          </button>
          <button onClick={()=>{ setStep('creds'); setOtp(''); setInfo(''); }} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>← Назад</button>
        </>)}
        {step==='setpass'&&(<>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль (мин. 6)" onKeyDown={e=>e.key==='Enter'&&setPass()} style={inp} />
          <button onClick={setPass} disabled={loading||password.length<6} style={{ padding:'13px', background:loading||password.length<6?'#e2e8f0':'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', borderRadius:12, color:loading||password.length<6?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||password.length<6?'default':'pointer', fontFamily:'inherit' }}>
            {loading?'⟳':'Создать аккаунт'}
          </button>
        </>)}
        <div style={{ textAlign:'center', fontSize:11, color:'#cbd5e1' }}>🔒 154-ФЗ · Данные на серверах РФ</div>
      </div>
    </div>
  );
}

// ─── Welcome ──────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#faf8ff,#f0f4ff)', padding:32 }}>
      <div style={{ width:88, height:88, borderRadius:28, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 12px 32px rgba(124,58,237,0.35)', overflow:'hidden' }}>
        <img src={icMessenger} alt="" style={{ width:60, height:60, objectFit:'cover' }} />
      </div>
      <div style={{ fontSize:24, fontWeight:800, color:'#1e293b', marginBottom:8 }}>Чайка Мессенджер</div>
      <div style={{ fontSize:14, color:'#94a3b8', marginBottom:36, textAlign:'center', maxWidth:320, lineHeight:1.7 }}>
        Выберите чат в списке слева или найдите каналы и пользователей
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, maxWidth:340, width:'100%' }}>
        {[
          { icon:icUser,    title:'Личные',   desc:'Сообщения',       color:'#2563eb' },
          { icon:icGroup,   title:'Группы',   desc:'Сообщества',      color:'#059669' },
          { icon:icChannel, title:'Каналы',   desc:'Публикации',      color:'#7c3aed' },
          { icon:icVoice,   title:'Голосовые',desc:'Аудиосообщения',  color:'#d97706' },
        ].map(f=>(
          <div key={f.title} style={{ background:'#fff', borderRadius:18, padding:'18px 16px', display:'flex', gap:12, alignItems:'center', border:'1px solid #f0f0f0', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ width:44, height:44, borderRadius:14, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <img src={f.icon} alt="" style={{ width:24, height:24 }} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{f.title}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function ChaikaMessenger() {
  const [authUser, setAuthUser] = useState<AuthUser|null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat|null>(null);
  const [view, setView] = useState('chats');
  const [unreadCount] = useState(0);

  useEffect(()=>{
    db.auth.getSession().then(({data:{session}})=>{
      if (session?.user) { setAuthUser({ id:session.user.id, email:session.user.email!, username:session.user.user_metadata?.username }); requestBrowserNotif(); }
      setAuthLoading(false);
    });
    const { data:{subscription} } = db.auth.onAuthStateChange((ev,session)=>{
      if (ev==='SIGNED_IN'&&session?.user) { setAuthUser({ id:session.user.id, email:session.user.email!, username:session.user.user_metadata?.username }); requestBrowserNotif(); }
      else if (ev==='SIGNED_OUT') setAuthUser(null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  if (authLoading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#f0f0ff,#e8f0fe)' }}>
      <div style={{ textAlign:'center', color:'#94a3b8' }}>
        <img src={icMessenger} alt="" style={{ width:52, height:52, marginBottom:16, borderRadius:14, boxShadow:'0 4px 16px rgba(124,58,237,0.2)' }} />
        <div style={{ fontSize:15, fontWeight:600, color:'#1e293b' }}>Чайка Мессенджер</div>
        <div style={{ fontSize:12, marginTop:6 }}>Подключение...</div>
      </div>
    </div>
  );

  if (!authUser) return <LoginView onAuth={u=>{ setAuthUser(u); requestBrowserNotif(); }} />;

  const userName = authUser.username || authUser.email.split('@')[0];

  const renderMain = () => {
    if (view==='discover') return <DiscoverView userId={authUser.id} onSelectChat={c=>{ setSelectedChat(c); setView('chats'); }} />;
    if (view==='shop') return <ShopView userId={authUser.id} />;
    if (view==='music') return <MusicView userId={authUser.id} />;
    if (view==='chats' && selectedChat) return <ChatView chat={selectedChat} userId={authUser.id} onBack={()=>setSelectedChat(null)} />;
    return <WelcomeScreen />;
  };

  return (
    <div style={{ height:'100%', display:'flex', fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#f8f7ff', overflow:'hidden' }}>
      <style>{`@keyframes voicePulse { from { box-shadow:0 0 0 0 rgba(220,38,38,0.4); } to { box-shadow:0 0 0 8px rgba(220,38,38,0); } }`}</style>
      <Sidebar userId={authUser.id} userName={userName} selectedId={selectedChat?.id||null}
        onSelect={c=>setSelectedChat(c)} activeView={view}
        onChangeView={v=>{ setView(v); if(v!=='chats') setSelectedChat(null); }}
        unreadCount={unreadCount} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {renderMain()}
      </div>
    </div>
  );
}
