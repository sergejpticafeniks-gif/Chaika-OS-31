import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// PNG icons
import icPlay    from '@/assets/icons/rigonda-play.png';
import icPause   from '@/assets/icons/rigonda-pause.png';
import icStop    from '@/assets/icons/rigonda-stop.png';
import icPrev    from '@/assets/icons/rigonda-prev.png';
import icNext    from '@/assets/icons/rigonda-next.png';
import icVolume  from '@/assets/icons/rigonda-volume.png';
import icShuffle from '@/assets/icons/rigonda-shuffle.png';
import icRepeat  from '@/assets/icons/rigonda-repeat.png';

interface Track {
  id: string;
  name: string;
  file_url: string;
  duration: number;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function Rigonda() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [eq, setEq] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const loadTracks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_music').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTracks((data as Track[]) || []);
  }, [user]);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => setBars(prev => prev.map(() => Math.random() * 100)), 100);
    } else {
      if (animRef.current) clearInterval(animRef.current);
      setBars(Array(20).fill(0));
    }
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [isPlaying]);

  const playTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = tracks[index].file_url;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (currentIndex < 0 && tracks.length > 0) { playTrack(0); return; }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setIsPlaying(true); }
  };

  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    const next = shuffle ? Math.floor(Math.random() * tracks.length) : (currentIndex + 1) % tracks.length;
    playTrack(next);
  }, [tracks, currentIndex, shuffle]);

  const playPrev = () => {
    if (tracks.length === 0) return;
    playTrack((currentIndex - 1 + tracks.length) % tracks.length);
  };

  const handleStop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false); setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const uploadTrack = async (file: File) => {
    if (!user || !file.type.includes('audio')) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data: upload, error } = await supabase.storage.from('music-files').upload(path, file, { contentType: file.type });
    if (!error && upload) {
      const { data: url } = supabase.storage.from('music-files').getPublicUrl(path);
      await supabase.from('user_music').insert({ user_id: user.id, name: file.name.replace(/\.[^.]+$/, ''), file_url: url.publicUrl });
      await loadTracks();
    }
    setUploading(false);
  };

  const deleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('user_music').delete().eq('id', id);
    if (tracks[currentIndex]?.id === id) handleStop();
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const titleText = currentTrack ? currentTrack.name : 'Ригонда — нет трека';
  const BG = '#2b1a0a';
  const PANEL = '#1a0d00';
  const AMBER = '#ffb347';
  const DARK_AMBER = '#8b5e00';
  const GREEN_VU = '#33ff66';

  // PNG control button
  const CtrlBtn = ({
    icon, title, onClick, active = false, label,
  }: { icon: string; title: string; onClick: () => void; active?: boolean; label?: string }) => (
    <button title={title} onClick={onClick}
      style={{
        minWidth: 38, height: 38, padding: '3px 6px',
        background: active
          ? 'linear-gradient(180deg, #5a3200, #3d1f00)'
          : 'linear-gradient(180deg, #4a2800, #2a1500)',
        border: `1px outset ${active ? AMBER : '#6b3a00'}`,
        cursor: 'pointer', borderRadius: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        flexShrink: 0,
        boxShadow: active ? `0 0 8px ${AMBER}50` : 'inset 0 1px 0 rgba(255,200,100,0.1)',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(180deg, #6a3800, #4a2000)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? 'linear-gradient(180deg, #5a3200, #3d1f00)' : 'linear-gradient(180deg, #4a2800, #2a1500)'}
    >
      <img src={icon} width={20} height={20} style={{ display: 'block', filter: active ? `drop-shadow(0 0 4px ${AMBER})` : 'none' }} />
      {label && <span style={{ fontSize: 7, color: active ? AMBER : DARK_AMBER, letterSpacing: 0.3 }}>{label}</span>}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, fontFamily: '"Courier New", monospace', fontSize: 11, color: AMBER, userSelect: 'none' }}>
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { if (repeat) audioRef.current?.play(); else playNext(); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* ===== Главная панель ===== */}
      <div style={{ background: PANEL, border: `2px outset #6b3a00`, padding: 10, userSelect: 'none' }}>

        {/* Заголовок */}
        <div style={{
          background: 'linear-gradient(90deg, #8b1a00 0%, #cc4400 50%, #8b1a00 100%)',
          display: 'flex', alignItems: 'center', padding: '5px 10px', marginBottom: 8, borderRadius: 4,
          border: '1px solid #ff6622',
        }}>
          <span style={{ fontSize: 14, color: '#ffdd88', fontWeight: 700, letterSpacing: 2, flex: 1, textShadow: '0 0 8px #ff6622' }}>
            ★ РИГОНДА ★
          </span>
          <span style={{ fontSize: 9, color: '#ff9944', letterSpacing: 1 }}>СТЕРЕО • FM</span>
        </div>

        {/* Дисплей */}
        <div style={{
          background: '#0a0500', border: '2px inset #6b3a00', padding: '6px 10px',
          marginBottom: 8, borderRadius: 3, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ color: AMBER, fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', letterSpacing: 1, fontWeight: 700, textShadow: `0 0 6px ${AMBER}` }}>
            {titleText}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 10, marginTop: 5 }}>
            <span style={{ color: isPlaying ? GREEN_VU : DARK_AMBER, textShadow: isPlaying ? `0 0 6px ${GREEN_VU}` : 'none', minWidth: 60 }}>
              {isPlaying ? '▶ ВОСПР.' : '■ СТОП'}
            </span>
            <span style={{ color: '#ff9944', flex: 1, textAlign: 'center', letterSpacing: 1 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span style={{ color: DARK_AMBER, minWidth: 50, textAlign: 'right' }}>
              ГРМ: {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Спектр VU */}
        <div style={{
          background: '#050200', border: '1px inset #3a1a00', height: 44,
          display: 'flex', alignItems: 'flex-end', gap: 1, padding: '3px 4px', marginBottom: 8,
          borderRadius: 3,
        }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${Math.max(2, h * 0.38)}px`,
              background: h > 75 ? '#ff3300' : h > 50 ? `hsl(${40 - h * 0.2}, 100%, 50%)` : GREEN_VU,
              transition: 'height 0.08s', borderRadius: '1px 1px 0 0',
            }} />
          ))}
        </div>

        {/* Ползунок перемотки */}
        <input type="range" min={0} max={duration || 100} value={currentTime} step={0.1} onChange={handleSeek}
          style={{ width: '100%', height: 5, accentColor: AMBER, cursor: 'pointer', display: 'block', marginBottom: 8 }} />

        {/* Громкость */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <img src={icVolume} width={20} height={20} style={{ display: 'block', flexShrink: 0 }} />
          <input type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => { setVolume(Number(e.target.value)); if (audioRef.current) audioRef.current.volume = Number(e.target.value); }}
            style={{ flex: 1, height: 5, accentColor: AMBER, cursor: 'pointer' }} />
          <span style={{ fontSize: 10, color: AMBER, width: 30, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
        </div>

        {/* Кнопки управления — PNG иконки */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <CtrlBtn icon={icPrev}    title="Предыдущий"    onClick={playPrev}    label="ПРЕД" />
          <CtrlBtn icon={isPlaying ? icPause : icPlay} title={isPlaying ? 'Пауза' : 'Воспроизвести'} onClick={togglePlay} active={isPlaying} label={isPlaying ? 'ПАУЗА' : 'ПУСК'} />
          <CtrlBtn icon={icStop}    title="Стоп"          onClick={handleStop}  label="СТОП" />
          <CtrlBtn icon={icNext}    title="Следующий"     onClick={playNext}    label="СЛЕД" />
          <CtrlBtn icon={icShuffle} title="Перемешать"   onClick={() => setShuffle(s => !s)} active={shuffle} label="РАНД" />
          <CtrlBtn icon={icRepeat}  title="Повторять"    onClick={() => setRepeat(r => !r)} active={repeat} label="ПОВТ" />
        </div>
      </div>

      {/* Эквалайзер */}
      {eq && (
        <div style={{ background: '#180a00', border: `1px solid #6b3a00`, padding: '6px 10px' }}>
          <div style={{ fontSize: 9, color: DARK_AMBER, marginBottom: 6, letterSpacing: 2 }}>── ЭКВАЛАЙЗЕР ──</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {['60', '170', '310', '600', '1К', '3К', '6К', '12К', '14К', '16К'].map(band => (
              <div key={band} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <input type="range" min={-12} max={12} defaultValue={0}
                  style={{ height: 50, width: 16, accentColor: AMBER, writingMode: 'vertical-lr', direction: 'rtl' }} />
                <span style={{ fontSize: 7, color: DARK_AMBER }}>{band}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Плейлист */}
      {showPlaylist && (
        <div style={{ background: '#120700', border: `1px solid #6b3a00`, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg, #6b1a00, #4a1000)', display: 'flex', alignItems: 'center', padding: '4px 10px', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: '#ffcc66', fontWeight: 700, letterSpacing: 1, flex: 1 }}>
              СПИСОК — {tracks.length} треков
            </span>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ padding: '2px 12px', background: '#3a1500', border: `1px solid ${AMBER}`, color: AMBER, fontSize: 9, cursor: 'pointer', borderRadius: 3, fontWeight: 700 }}>
              {uploading ? '...' : '+ ДОБАВИТЬ'}
            </button>
            <button onClick={() => setShowPlaylist(false)} style={{ width: 18, height: 16, background: '#8b0000', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 9, borderRadius: 2 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tracks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: DARK_AMBER }}>
                <div style={{ fontSize: 40, marginBottom: 8, filter: `drop-shadow(0 0 6px ${AMBER})` }}>📻</div>
                <div style={{ color: '#cc7722', fontWeight: 700, marginBottom: 4 }}>Нет треков</div>
                <div style={{ fontSize: 10, color: DARK_AMBER, lineHeight: 1.6 }}>Нажмите «+ ДОБАВИТЬ»<br />для загрузки MP3</div>
              </div>
            ) : tracks.map((track, i) => (
              <div key={track.id} onClick={() => playTrack(i)}
                style={{
                  padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: currentIndex === i ? '#2a1400' : 'none', borderBottom: '1px solid #1a0a00',
                  color: currentIndex === i ? AMBER : '#885522', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (currentIndex !== i) e.currentTarget.style.background = '#1f0e00'; }}
                onMouseLeave={e => { if (currentIndex !== i) e.currentTarget.style.background = 'none'; }}>
                <span style={{ width: 18, fontSize: 11, color: currentIndex === i && isPlaying ? GREEN_VU : DARK_AMBER, textAlign: 'right', flexShrink: 0 }}>
                  {currentIndex === i && isPlaying
                    ? <img src={icPlay} width={14} height={14} style={{ display: 'block', filter: 'hue-rotate(90deg) brightness(2)' }} />
                    : i + 1}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{track.name}</span>
                {track.duration > 0 && <span style={{ fontSize: 10, color: DARK_AMBER, flexShrink: 0 }}>{formatTime(track.duration)}</span>}
                <button onClick={e => deleteTrack(track.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b2200', fontSize: 13, padding: 0, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ff4422')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8b2200')}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ padding: '5px 10px', borderTop: `1px solid #3a1a00`, display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            {[
              { label: 'ЭКВ', action: () => setEq(e => !e), active: eq, icon: null },
              { label: 'РАНД', action: () => setShuffle(s => !s), active: shuffle, icon: icShuffle },
              { label: 'ПОВТ', action: () => setRepeat(r => !r), active: repeat, icon: icRepeat },
            ].map(b => (
              <button key={b.label} onClick={b.action}
                style={{
                  padding: '3px 8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: b.active ? '#3a1a00' : '#1a0a00',
                  border: `1px solid ${b.active ? AMBER : '#4a2800'}`,
                  color: b.active ? AMBER : DARK_AMBER,
                  fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: 0.5,
                  boxShadow: b.active ? `0 0 4px ${AMBER}30` : 'none',
                }}>
                {b.icon && <img src={b.icon} width={12} height={12} style={{ display: 'block' }} />}
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showPlaylist && (
        <div style={{ background: '#120700', padding: '5px 10px', display: 'flex', gap: 6, border: `1px solid #6b3a00` }}>
          <button onClick={() => setShowPlaylist(true)} style={{ padding: '3px 12px', background: '#1a0a00', border: `1px solid ${AMBER}`, color: AMBER, fontSize: 10, cursor: 'pointer', borderRadius: 3 }}>
            📋 Плейлист
          </button>
          <button onClick={() => setEq(e => !e)} style={{ padding: '3px 12px', background: eq ? '#3a1a00' : '#1a0a00', border: `1px solid ${eq ? AMBER : '#4a2800'}`, color: eq ? AMBER : DARK_AMBER, fontSize: 10, cursor: 'pointer', borderRadius: 3 }}>
            ЭКВ
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/flac" multiple style={{ display: 'none' }}
        onChange={async e => {
          for (const f of Array.from(e.target.files || [])) await uploadTrack(f);
          e.target.value = '';
        }} />
    </div>
  );
}
