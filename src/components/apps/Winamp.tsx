import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

export default function Winamp() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [balance, setBalance] = useState(0);
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

  // Animate spectrum bars when playing
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setBars(prev => prev.map(() => Math.random() * 100));
      }, 100);
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
    let next: number;
    if (shuffle) next = Math.floor(Math.random() * tracks.length);
    else next = (currentIndex + 1) % tracks.length;
    playTrack(next);
  }, [tracks, currentIndex, shuffle]);

  const playPrev = () => {
    if (tracks.length === 0) return;
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(prev);
  };

  const handleStop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const uploadTrack = async (file: File) => {
    if (!user) return;
    if (!file.type.includes('audio')) return;
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

  const titleText = currentTrack ? currentTrack.name : 'WINAMP 3.11 — НЕТ ТРЕКА';
  const scrollLen = Math.max(0, titleText.length - 25);

  // Winamp color constants
  const bg = '#1f1f1f';
  const green = '#00ff00';
  const darkGreen = '#006600';
  const panelBg = '#000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#2a2a2a', fontFamily: '"Courier New", monospace', fontSize: 11, color: green }}>
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { if (repeat) audioRef.current?.play(); else playNext(); setIsPlaying(!(!repeat && currentIndex === tracks.length - 1)); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Main panel */}
      <div style={{ background: bg, border: '1px solid #555', borderBottom: 'none', padding: 6, userSelect: 'none' }}>
        {/* Title bar */}
        <div style={{ background: 'linear-gradient(90deg, #00aabb 0%, #0066aa 100%)', display: 'flex', alignItems: 'center', padding: '2px 6px', marginBottom: 4, borderRadius: 2 }}>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: 1, flex: 1 }}>WINAMP</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setShuffle(s => !s)} style={{ width: 16, height: 11, background: shuffle ? '#00ccff' : '#336688', border: 'none', cursor: 'pointer', fontSize: 8, color: '#fff' }}>S</button>
            <button onClick={() => setRepeat(r => !r)} style={{ width: 16, height: 11, background: repeat ? '#00ccff' : '#336688', border: 'none', cursor: 'pointer', fontSize: 8, color: '#fff' }}>R</button>
          </div>
        </div>

        {/* Display */}
        <div style={{ background: panelBg, border: '2px inset #333', padding: '4px 6px', marginBottom: 4, height: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div style={{ color: green, fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', letterSpacing: 1, fontWeight: 700 }}>
            {titleText}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9 }}>
            <span style={{ color: isPlaying ? '#00ff00' : '#005500' }}>{isPlaying ? '▶ PLAY' : '■ STOP'}</span>
            <span style={{ color: '#00aaaa', flex: 1, textAlign: 'center' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span style={{ color: '#aa8800' }}>{currentTrack ? `${Math.round(volume * 100)}% VOL` : ''}</span>
          </div>
        </div>

        {/* Spectrum visualizer */}
        <div style={{ background: panelBg, border: '1px solid #333', height: 36, display: 'flex', alignItems: 'flex-end', gap: 1, padding: '2px 4px', marginBottom: 4 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(2, h * 0.32)}px`, background: `hsl(${120 - h}, 100%, 45%)`, transition: 'height 0.1s' }} />
          ))}
        </div>

        {/* Seek bar */}
        <input
          type="range" min={0} max={duration || 100} value={currentTime} step={0.1}
          onChange={handleSeek}
          style={{ width: '100%', height: 6, accentColor: green, cursor: 'pointer', display: 'block', marginBottom: 6 }}
        />

        {/* Volume + Balance */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#888', width: 22 }}>VOL</span>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => handleVolumeChange(Number(e.target.value))} style={{ flex: 1, height: 4, accentColor: green, cursor: 'pointer' }} />
          <span style={{ fontSize: 9, color: '#888', width: 22 }}>BAL</span>
          <input type="range" min={-1} max={1} step={0.01} value={balance} onChange={e => setBalance(Number(e.target.value))} style={{ width: 60, height: 4, accentColor: green, cursor: 'pointer' }} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center' }}>
          {[
            { icon: '⏮', title: 'Предыдущий', onClick: playPrev },
            { icon: '⏪', title: 'Перемотка назад', onClick: () => { if (audioRef.current) audioRef.current.currentTime -= 5; } },
            { icon: isPlaying ? '⏸' : '▶', title: isPlaying ? 'Пауза' : 'Играть', onClick: togglePlay, highlight: isPlaying },
            { icon: '⏩', title: 'Перемотка вперёд', onClick: () => { if (audioRef.current) audioRef.current.currentTime += 5; } },
            { icon: '⏭', title: 'Следующий', onClick: playNext },
            { icon: '⏹', title: 'Стоп', onClick: handleStop },
          ].map(btn => (
            <button key={btn.icon} title={btn.title} onClick={btn.onClick} style={{
              width: 32, height: 22, background: (btn as any).highlight ? '#004400' : 'linear-gradient(180deg, #444, #222)',
              border: '1px outset #666', cursor: 'pointer', color: (btn as any).highlight ? green : '#aaa',
              fontSize: 12, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Equalizer panel (toggle) */}
      {eq && (
        <div style={{ background: '#1a1a1a', border: '1px solid #555', borderBottom: 'none', padding: '4px 8px' }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>ЭКВАЛАЙЗЕР</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'].map(band => (
              <div key={band} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <input type="range" min={-12} max={12} defaultValue={0} orient="vertical" style={{ height: 50, width: 16, accentColor: green, writingMode: 'vertical-lr' }} />
                <span style={{ fontSize: 8, color: '#555' }}>{band}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlist panel */}
      {showPlaylist && (
        <div style={{ background: '#1a1a1a', border: '1px solid #555', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg, #00aabb, #0066aa)', display: 'flex', alignItems: 'center', padding: '2px 6px', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 700, letterSpacing: 1, flex: 1 }}>PLAYLIST EDITOR — {tracks.length} TRACKS</span>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: '1px 8px', background: '#006633', border: '1px solid #00aa55', color: green, fontSize: 9, cursor: 'pointer', borderRadius: 2 }}>
              {uploading ? '...' : '+ ADD'}
            </button>
            <button onClick={() => setShowPlaylist(false)} style={{ width: 14, height: 11, background: '#aa3333', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 9 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tracks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#444' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎵</div>
                <div>Нажмите ADD для добавления MP3</div>
                <div style={{ fontSize: 10, marginTop: 4, color: '#333' }}>Файлы сохраняются в Мои Документы/Музыка</div>
              </div>
            ) : tracks.map((track, i) => (
              <div key={track.id} onClick={() => playTrack(i)} style={{
                padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: currentIndex === i ? '#003300' : 'none',
                borderBottom: '1px solid #222',
                color: currentIndex === i ? green : '#888',
              }}
                onMouseEnter={e => { if (currentIndex !== i) e.currentTarget.style.background = '#001a00'; }}
                onMouseLeave={e => { if (currentIndex !== i) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ width: 16, fontSize: 10, color: currentIndex === i && isPlaying ? green : '#444', textAlign: 'right', flexShrink: 0 }}>
                  {currentIndex === i && isPlaying ? '▶' : (i + 1)}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{track.name}</span>
                {track.duration > 0 && <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>{formatTime(track.duration)}</span>}
                <button onClick={e => deleteTrack(track.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aa3333', fontSize: 12, padding: 0, opacity: 0.5, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ padding: '4px 8px', borderTop: '1px solid #333', display: 'flex', gap: 6, flexShrink: 0 }}>
            {[
              { label: 'EQ', onClick: () => setEq(e => !e), active: eq },
              { label: 'SHF', onClick: () => setShuffle(s => !s), active: shuffle },
              { label: 'REP', onClick: () => setRepeat(r => !r), active: repeat },
            ].map(b => (
              <button key={b.label} onClick={b.onClick} style={{ padding: '1px 8px', background: b.active ? '#003300' : '#1a1a1a', border: `1px solid ${b.active ? green : '#444'}`, color: b.active ? green : '#555', fontSize: 9, cursor: 'pointer', borderRadius: 2, fontFamily: 'monospace', letterSpacing: 1 }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showPlaylist && (
        <div style={{ background: '#1a1a1a', padding: '4px 8px', display: 'flex', gap: 6, border: '1px solid #555' }}>
          <button onClick={() => setShowPlaylist(true)} style={{ padding: '2px 10px', background: '#222', border: '1px solid #444', color: '#888', fontSize: 10, cursor: 'pointer' }}>📋 PL</button>
          <button onClick={() => setEq(e => !e)} style={{ padding: '2px 10px', background: eq ? '#003300' : '#222', border: `1px solid ${eq ? green : '#444'}`, color: eq ? green : '#888', fontSize: 10, cursor: 'pointer' }}>EQ</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/flac" multiple style={{ display: 'none' }}
        onChange={async e => { const files = Array.from(e.target.files || []); for (const f of files) await uploadTrack(f); e.target.value = ''; }} />
    </div>
  );
}
