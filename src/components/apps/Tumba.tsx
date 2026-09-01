
/**
 * Тумба — Видеохостинг v3
 * Backend: https://jllfhfqykhobpuktjllf.backend.onspace.ai
 * - Видео без авторизации
 * - Реакции на карточках
 * - Отправка ссылки в мессенджер
 * - История просмотров (watch_history)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import icTumba from '@/assets/icons/tumba.png';

const TUMBA_URL = 'https://jllfhfqykhobpuktjllf.backend.onspace.ai';
const TUMBA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqd7cbJkcYnBFO2TgCbfoxHiCBLVMjPvs';

const db = createClient(TUMBA_URL, TUMBA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { 'apikey': TUMBA_KEY, 'Authorization': `Bearer ${TUMBA_KEY}` } }
});

interface TumbaUser { id: string; email: string; username?: string; }
interface Video {
  id: string; title: string; description?: string; author_id: string;
  thumbnail_url?: string; video_url?: string; embed_url?: string; source_type?: string;
  duration?: string; views?: number; likes_count?: number; dislikes_count?: number;
  category?: string; tags?: string[]; is_short?: boolean; moderation_status?: string;
  created_at: string;
  user_profiles?: { id: string; username: string; display_name?: string; avatar_url?: string; subscribers_count?: number; };
}
interface Comment {
  id: string; video_id: string; author_id: string; text: string; created_at: string;
  user_profiles?: { id: string; username: string; display_name?: string; avatar_url?: string; };
}

function avatarBg(name: string) {
  const colors = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899'];
  let h = 0; for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return colors[Math.abs(h)%colors.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():name.slice(0,2).toUpperCase();
}
function fmtViews(n: number) {
  if (n>=1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n>=1000) return `${(n/1000).toFixed(0)}K`;
  return String(n);
}
function fmtTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff/60000)} мин. назад`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)} ч. назад`;
  if (diff < 2592000000) return `${Math.floor(diff/86400000)} д. назад`;
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric'});
}
function extractEmbedUrl(video: Video) {
  if (video.embed_url) return video.embed_url;
  if (video.video_url) {
    const yt = video.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
    const rt = video.video_url.match(/rutube\.ru\/video\/([a-f0-9]+)/);
    if (rt) return `https://rutube.ru/play/embed/${rt[1]}`;
    return video.video_url;
  }
  return null;
}

function shareToMessenger(video: Video) {
  const url = video.video_url || video.embed_url || '';
  const text = `🎬 ${video.title}${url ? `\n${url}` : ''}`;
  // Dispatch OS event — opens Messenger and pastes the share text
  window.dispatchEvent(new CustomEvent('chaika-open-app', {
    detail: { appId: 'messenger', shareText: text }
  }));
  navigator.clipboard.writeText(text).catch(() => {});
} // This closing brace was missing, leading to the parsing error.

// ─── Card Reactions ───────────────────────────────────────────
function CardReactions({ video, userId, visible }: { video: Video; userId?: string; visible: boolean }) {
  const [likes, setLikes] = useState(video.likes_count || 0);
  const [dislikes, setDislikes] = useState(video.dislikes_count || 0);
  const [myReaction, setMyReaction] = useState<'like'|'dislike'|null>(null);
  const [animLike, setAnimLike] = useState(false);
  const [animDislike, setAnimDislike] = useState(false);

  const react = (e: React.MouseEvent, type: 'like'|'dislike') => {
    e.stopPropagation();
    if (!userId) return;
    const prev = myReaction;
    if (type==='like') {
      setAnimLike(true); setTimeout(()=>setAnimLike(false), 400);
      if (prev==='like') { setMyReaction(null); setLikes(l=>l-1); }
      else { setMyReaction('like'); setLikes(l=>l+1); if(prev==='dislike') setDislikes(d=>d-1); }
    } else {
      setAnimDislike(true); setTimeout(()=>setAnimDislike(false), 400);
      if (prev==='dislike') { setMyReaction(null); setDislikes(d=>d-1); }
      else { setMyReaction('dislike'); setDislikes(d=>d+1); if(prev==='like') setLikes(l=>l-1); }
    }
    db.rpc('toggle_video_reaction', { vid: video.id, uid: userId, react: type }).catch(()=>{});
  };

  if (!visible) return null;
  return (
    <div style={{ position:'absolute', bottom:8, right:8, display:'flex', gap:4, zIndex:5 }} onClick={e=>e.stopPropagation()}>
      <button onClick={e=>react(e,'like')} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:20, border:'none', cursor:userId?'pointer':'default', fontSize:12, fontWeight:700, background:myReaction==='like'?'rgba(59,130,246,0.9)':'rgba(0,0,0,0.65)', color:'#fff', backdropFilter:'blur(8px)', transform:animLike?'scale(1.3)':'scale(1)', transition:'all 0.15s' }}>
        👍 {likes}
      </button>
      <button onClick={e=>react(e,'dislike')} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:20, border:'none', cursor:userId?'pointer':'default', fontSize:12, fontWeight:700, background:myReaction==='dislike'?'rgba(239,68,68,0.9)':'rgba(0,0,0,0.65)', color:'#fff', backdropFilter:'blur(8px)', transform:animDislike?'scale(1.3)':'scale(1)', transition:'all 0.15s' }}>
        👎 {dislikes}
      </button>
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────
function VideoCard({ video, onClick, userId }: { video: Video; onClick: ()=>void; userId?: string }) {
  const author = video.user_profiles;
  const authorName = author?.display_name || author?.username || 'Неизвестный';
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ cursor:'pointer', borderRadius:14, overflow:'hidden', background:'#fff', border:'1px solid #f0f0f0', boxShadow:hovered?'0 12px 32px rgba(0,0,0,0.14)':'0 2px 10px rgba(0,0,0,0.06)', transition:'all 0.2s', transform:hovered?'translateY(-3px)':'translateY(0)' }}>
      <div style={{ position:'relative', paddingTop:'56.25%', background:'linear-gradient(135deg,#1a1a2e,#16213e)', overflow:'hidden' }}>
        {video.thumbnail_url && !imgError ? (
          <img src={video.thumbnail_url} alt={video.title} onError={()=>setImgError(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s', transform:hovered?'scale(1.05)':'scale(1)' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>▶</div>
        )}
        <div style={{ position:'absolute', inset:0, background:hovered?'rgba(0,0,0,0.2)':'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
          {hovered && <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(239,68,68,0.92)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', boxShadow:'0 4px 16px rgba(239,68,68,0.6)' }}>▶</div>}
        </div>
        {video.duration && <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.8)', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{video.duration}</div>}
        {video.is_short && <div style={{ position:'absolute', top:8, left:8, background:'#ef4444', color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:800 }}>SHORT</div>}
        <CardReactions video={video} userId={userId} visible={hovered} />
        {hovered && (
          <button onClick={e=>{ e.stopPropagation(); shareToMessenger(video); }}
            style={{ position:'absolute', top:8, right:8, background:'rgba(124,58,237,0.85)', border:'none', borderRadius:20, padding:'4px 10px', color:'#fff', fontSize:10, cursor:'pointer', fontWeight:700, backdropFilter:'blur(8px)' }}>
            ✈ Чайка
          </button>
        )}
      </div>
      <div style={{ padding:'12px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.4, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{video.title}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:avatarBg(authorName), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden' }}>
            {author?.avatar_url ? <img src={author.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.currentTarget.style.display='none'} /> : initials(authorName)}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{authorName}</div>
            <div style={{ display:'flex', gap:8, fontSize:11, color:'#94a3b8' }}>
              {video.views ? <span>👁 {fmtViews(video.views)}</span> : null}
              <span>{fmtTime(video.created_at)}</span>
            </div>
          </div>
        </div>
        {video.category && <div style={{ marginTop:8 }}><span style={{ fontSize:10, background:'#f1f5f9', color:'#64748b', borderRadius:20, padding:'2px 8px', fontWeight:600 }}>{video.category}</span></div>}
      </div>
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────
function VideoPlayer({ video, userId, onBack }: { video: Video; userId?: string; onBack: ()=>void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [liked, setLiked] = useState<boolean|null>(null);
  const [likes, setLikes] = useState(video.likes_count||0);
  const [dislikes, setDislikes] = useState(video.dislikes_count||0);
  const [subscribed, setSubscribed] = useState(false);
  const embedUrl = extractEmbedUrl(video);
  const author = video.user_profiles;
  const authorName = author?.display_name || author?.username || 'Неизвестный';

  useEffect(()=>{
    db.rpc('increment_video_views', { vid: video.id }).catch(()=>{});
    // Save to history
    if (userId) db.from('watch_history').upsert({ user_id: userId, video_id: video.id, watched_at: new Date().toISOString() }, { onConflict: 'user_id,video_id' }).catch(()=>{});
    const loadComments = async () => {
      const { data } = await db.from('comments').select('*, user_profiles(id,username,display_name,avatar_url)').eq('video_id',video.id).eq('is_blocked',false).order('created_at',{ascending:false});
      setComments((data as Comment[])||[]);
    };
    loadComments();
    const t = setInterval(loadComments, 5000);
    return ()=>clearInterval(t);
  },[video.id, userId]);

  useEffect(()=>{
    if (!userId) return;
    db.from('video_reactions').select('reaction').eq('video_id',video.id).eq('user_id',userId).single().then(({data})=>{ if(data) setLiked((data as any).reaction==='like'); });
    if (author?.id) db.from('subscriptions').select('id').eq('subscriber_id',userId).eq('channel_id',author.id).single().then(({data})=>setSubscribed(!!data));
  },[userId, video.id, author?.id]);

  const toggleReact = async (reaction: 'like'|'dislike') => {
    if (!userId) return;
    try {
      const { data } = await db.rpc('toggle_video_reaction', { vid:video.id, uid:userId, react:reaction });
      if (data) { setLikes(data.likes); setDislikes(data.dislikes); }
      setLiked(reaction==='like'?(liked===true?null:true):null);
    } catch {}
  };

  const toggleSubscribe = async () => {
    if (!userId||!author?.id) return;
    if (subscribed) { await db.rpc('unsubscribe_from_channel', { subscriber:userId, channel:author.id }); setSubscribed(false); }
    else { await db.rpc('subscribe_to_channel', { subscriber:userId, channel:author.id }); setSubscribed(true); }
  };

  const addComment = async () => {
    if (!commentText.trim()||!userId||commentLoading) return;
    setCommentLoading(true);
    const { data } = await db.from('comments').insert({ video_id:video.id, author_id:userId, text:commentText.trim() }).select('*, user_profiles(id,username,display_name,avatar_url)').single();
    if (data) setComments(c=>[data as Comment,...c]);
    setCommentText(''); setCommentLoading(false);
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#fff', overflowY:'auto' }}>
      <div style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onBack} style={{ padding:'7px 14px', background:'#f1f5f9', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, color:'#64748b', fontFamily:'inherit' }}>← Назад</button>
        <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{video.title}</div>
        <button onClick={()=>shareToMessenger(video)} style={{ padding:'7px 14px', background:'#7c3aed', border:'none', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', fontFamily:'inherit', whiteSpace:'nowrap' }}>✈ В Чайку</button>
      </div>
      <div style={{ paddingBottom:24 }}>
        <div style={{ position:'relative', paddingTop:'56.25%', background:'#0f172a' }}>
          {embedUrl ? (
            <iframe src={embedUrl} style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : video.video_url ? (
            <video src={video.video_url} controls autoPlay style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
          ) : (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', flexDirection:'column', gap:12 }}><div style={{ fontSize:48 }}>▶</div><div>Видео недоступно</div></div>
          )}
        </div>
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', lineHeight:1.4, marginBottom:12 }}>{video.title}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#94a3b8', flex:1 }}>{video.views ? <span>👁 {fmtViews(video.views)} просмотров · </span> : null}{fmtTime(video.created_at)}</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>toggleReact('like')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:`1.5px solid ${liked===true?'#3b82f6':'#e2e8f0'}`, background:liked===true?'#eff6ff':'none', cursor:userId?'pointer':'default', fontSize:13, fontWeight:700, color:liked===true?'#3b82f6':'#64748b', transition:'all 0.12s', fontFamily:'inherit' }}>👍 {likes}</button>
              <button onClick={()=>toggleReact('dislike')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:`1.5px solid ${liked===false?'#ef4444':'#e2e8f0'}`, background:liked===false?'#fef2f2':'none', cursor:userId?'pointer':'default', fontSize:13, fontWeight:700, color:liked===false?'#ef4444':'#64748b', transition:'all 0.12s', fontFamily:'inherit' }}>👎 {dislikes}</button>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:14, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:avatarBg(authorName), display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {author?.avatar_url ? <img src={author.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : initials(authorName)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{authorName}</div>
              {author?.subscribers_count ? <div style={{ fontSize:12, color:'#94a3b8' }}>{fmtViews(author.subscribers_count)} подписчиков</div> : null}
            </div>
            {userId && author?.id && userId!==author.id && (
              <button onClick={toggleSubscribe} style={{ padding:'8px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', background:subscribed?'#f1f5f9':'#ef4444', color:subscribed?'#64748b':'#fff', boxShadow:subscribed?'none':'0 3px 8px rgba(239,68,68,0.3)', transition:'all 0.15s' }}>
                {subscribed ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
          {video.description && <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13, color:'#334155', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{video.description}</div>}
          <div style={{ borderTop:'1px solid #f0f0f0', paddingTop:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:14 }}>💬 Комментарии ({comments.length})</div>
            {userId ? (
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                <div style={{ flex:1, background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'10px 14px' }}>
                  <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); addComment(); }}} placeholder="Написать комментарий..." rows={2} style={{ width:'100%', border:'none', outline:'none', background:'none', color:'#1e293b', fontSize:13, resize:'none', fontFamily:'inherit', lineHeight:1.5 }} />
                </div>
                <button onClick={addComment} disabled={!commentText.trim()||commentLoading} style={{ padding:'0 16px', background:commentText.trim()&&!commentLoading?'#ef4444':'#e2e8f0', border:'none', borderRadius:12, color:'#fff', cursor:commentText.trim()&&!commentLoading?'pointer':'default', fontSize:13, fontWeight:700, fontFamily:'inherit', alignSelf:'stretch' }}>{commentLoading?'⟳':'➤'}</button>
              </div>
            ) : <div style={{ fontSize:13, color:'#94a3b8', marginBottom:16 }}>Войдите, чтобы оставить комментарий</div>}
            {comments.map(c => {
              const cName = c.user_profiles?.display_name || c.user_profiles?.username || 'Пользователь';
              return (
                <div key={c.id} style={{ display:'flex', gap:10, marginBottom:16 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:avatarBg(cName), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {c.user_profiles?.avatar_url ? <img src={c.user_profiles.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : initials(cName)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{cName}</span>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize:13, color:'#334155', lineHeight:1.6 }}>{c.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload ───────────────────────────────────────────────────
function UploadView({ userId, onDone }: { userId: string; onDone: ()=>void }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [category, setCategory] = useState(''); const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbFile, setThumbFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false); const [progress, setProgress] = useState(0);
  const thumbRef = useRef<HTMLInputElement>(null);
  const CATEGORIES = ['Музыка','Игры','Образование','Спорт','Новости','Технологии','Кулинария','Путешествия','Юмор','Наука'];

  const submit = async () => {
    if (!title.trim()) { alert('Введите название'); return; }
    setLoading(true); setProgress(20);
    let thumbnail_url = 'https://placehold.co/1280x720/1a1a2e/fff?text=Тумба';
    if (thumbFile) {
      setProgress(50);
      const tpath = `${userId}/${Date.now()}-${thumbFile.name}`;
      const { data:td } = await db.storage.from('thumbnails').upload(tpath, thumbFile, { upsert:false });
      if (td) { const { data:tu } = db.storage.from('thumbnails').getPublicUrl(tpath); thumbnail_url = tu.publicUrl; }
    }
    setProgress(80);
    await db.from('videos').insert({ title: title.trim(), description: description.trim()||null, author_id: userId, video_url: youtubeUrl.trim()||null, thumbnail_url, source_type:'link', moderation_status:'approved', category: category||null });
    setProgress(100); setLoading(false); onDone(); alert('✅ Видео опубликовано!');
  };

  const inp = { padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', color:'#1e293b', width:'100%', boxSizing:'border-box' as const, transition:'border-color 0.15s' };

  return (
    <div style={{ padding:24, maxWidth:600, overflowY:'auto', height:'100%' }}>
      <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', marginBottom:20 }}>📤 Загрузить видео</div>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div><label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:6 }}>Ссылка YouTube/Rutube</label><input value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inp} /></div>
        <div><label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:6 }}>Название *</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название видео..." style={inp} /></div>
        <div><label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:6 }}>Описание</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} style={{ ...inp, resize:'vertical' }} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:6 }}>Категория</label><select value={category} onChange={e=>setCategory(e.target.value)} style={{ ...inp, cursor:'pointer' }}><option value="">Выбрать...</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:6 }}>Превью</label><div onClick={()=>thumbRef.current?.click()} style={{ ...inp, cursor:'pointer', color:thumbFile?'#22c55e':'#94a3b8' }}>{thumbFile?`✓ ${thumbFile.name.slice(0,18)}...`:'Выбрать файл...'}</div><input ref={thumbRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setThumbFile(e.target.files?.[0]||null)} /></div>
        </div>
        {loading && <div><div style={{ background:'#f1f5f9', borderRadius:20, height:6, overflow:'hidden' }}><div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#ef4444,#f97316)', borderRadius:20, transition:'width 0.3s' }} /></div><div style={{ fontSize:12, color:'#94a3b8', textAlign:'center', marginTop:6 }}>Загрузка... {progress}%</div></div>}
        <button onClick={submit} disabled={loading||!title.trim()} style={{ padding:'13px', background:loading||!title.trim()?'#e2e8f0':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:12, color:loading||!title.trim()?'#94a3b8':'#fff', fontSize:15, fontWeight:700, cursor:loading||!title.trim()?'default':'pointer', fontFamily:'inherit' }}>
          {loading ? '⟳ Публикация...' : '📤 Опубликовать'}
        </button>
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────
function HistoryView({ userId, onSelect }: { userId: string; onSelect: (v: Video)=>void }) {
  const [history, setHistory] = useState<{ video: Video; watched_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    db.from('watch_history')
      .select('watched_at, videos(*, user_profiles(id,username,display_name,avatar_url))')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const items = (data || []).map((d: any) => ({ video: d.videos as Video, watched_at: d.watched_at })).filter(x => !!x.video);
        setHistory(items);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Загрузка...</div>;
  if (!history.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⏱</div>
      <div style={{ fontSize:15, fontWeight:600 }}>История пуста</div>
      <div style={{ fontSize:13, marginTop:6 }}>Просмотренные видео появятся здесь</div>
    </div>
  );

  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:16, fontWeight:800, color:'#1e293b', marginBottom:16 }}>⏱ История просмотров</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {history.map(({ video, watched_at }) => {
          const author = video.user_profiles;
          const authorName = author?.display_name || author?.username || 'Неизвестный';
          return (
            <div key={video.id + watched_at} onClick={()=>onSelect(video)}
              style={{ display:'flex', gap:12, background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{ width:128, height:72, flexShrink:0, background:'#1a1a2e', position:'relative' }}>
                {video.thumbnail_url ? <img src={video.thumbnail_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.currentTarget.style.display='none'} /> : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'rgba(255,255,255,0.4)' }}>▶</div>}
              </div>
              <div style={{ flex:1, padding:'10px 12px 10px 0', minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{video.title}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{authorName}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4, display:'flex', gap:8 }}>
                  {video.views ? <span>👁 {fmtViews(video.views)}</span> : null}
                  <span>Просмотрено {fmtTime(watched_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function SkeletonGrid({ count=8 }: { count?: number }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{ borderRadius:14, overflow:'hidden', background:'#f8fafc', border:'1px solid #f0f0f0' }}>
          <div style={{ paddingTop:'56.25%', background:'linear-gradient(135deg,#f1f5f9,#e2e8f0)', animation:'tumba-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ padding:12 }}>
            <div style={{ height:14, background:'#e2e8f0', borderRadius:6, marginBottom:8, animation:'tumba-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height:10, background:'#f1f5f9', borderRadius:6, width:'60%', animation:'tumba-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────
function LoginView({ onAuth, onSkip }: { onAuth: (u: TumbaUser)=>void; onSkip: ()=>void }) {
  const [tab, setTab] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); const [step, setStep] = useState<'creds'|'otp'|'setpass'>('creds');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('');

  const login = async () => {
    setLoading(true); setErr('');
    const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error||!data.user) { setErr(error?.message||'Ошибка входа'); setLoading(false); return; }
    onAuth({ id:data.user.id, email:data.user.email!, username:data.user.user_metadata?.username });
    setLoading(false);
  };
  const sendOtp = async () => {
    setLoading(true); setErr('');
    const { error } = await db.auth.signInWithOtp({ email: email.trim(), options:{ shouldCreateUser:true } });
    if (error) { setErr(error.message); setLoading(false); return; }
    setStep('otp'); setLoading(false);
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
    onAuth({ id:data.user.id, email:data.user.email!, username:data.user.user_metadata?.username });
    setLoading(false);
  };

  const inp = { padding:'12px 16px', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, fontSize:14, outline:'none', fontFamily:'inherit', color:'#fff', width:'100%', boxSizing:'border-box' as const };

  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#0f0f23 0%,#1a0a2e 50%,#0f172a 100%)' }}>
      <div style={{ width:380, background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:36, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ textAlign:'center' }}>
          <img src={icTumba} style={{ width:64, height:64, borderRadius:16, marginBottom:8 }} alt="" />
          <div style={{ fontSize:22, fontWeight:800, color:'#fff' }}>Тумба</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', letterSpacing:2 }}>ВИДЕОХОСТИНГ</div>
        </div>
        <button onClick={onSkip} style={{ padding:'10px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, color:'rgba(255,255,255,0.8)', fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>👁 Смотреть без входа</button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)' }} /><span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>или</span><div style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)' }} /></div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.07)', borderRadius:10, padding:3 }}>
          {(['login','register'] as const).map(t=>(
            <button key={t} onClick={()=>{ setTab(t as any); setStep('creds'); setErr(''); }}
              style={{ flex:1, padding:'8px', border:'none', cursor:'pointer', borderRadius:8, fontSize:13, fontWeight:700, background:tab===t?'#ef4444':'none', color:tab===t?'#fff':'rgba(255,255,255,0.6)', transition:'all 0.15s', fontFamily:'inherit' }}>
              {t==='login'?'Войти':'Регистрация'}
            </button>
          ))}
        </div>
        {err && <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fca5a5' }}>⚠️ {err}</div>}
        {step==='creds'&&tab==='login'&&(<>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" onKeyDown={e=>e.key==='Enter'&&login()} style={inp} />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" onKeyDown={e=>e.key==='Enter'&&login()} style={inp} />
          <button onClick={login} disabled={loading||!email||!password} style={{ padding:'13px', background:loading||!email||!password?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:loading||!email||!password?'default':'pointer', fontFamily:'inherit' }}>{loading?'⟳ Вход...':'Войти'}</button>
        </>)}
        {step==='creds'&&tab==='register'&&(<>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={inp} />
          <button onClick={sendOtp} disabled={loading||!email} style={{ padding:'13px', background:loading||!email?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:loading||!email?'default':'pointer', fontFamily:'inherit' }}>{loading?'⟳':'Получить код'}</button>
        </>)}
        {step==='otp'&&(<>
          <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Код из письма" maxLength={8} onKeyDown={e=>e.key==='Enter'&&verifyOtp()} style={{ ...inp, fontSize:24, textAlign:'center', letterSpacing:8 }} />
          <button onClick={verifyOtp} disabled={loading||!otp} style={{ padding:'13px', background:loading||!otp?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:loading||!otp?'default':'pointer', fontFamily:'inherit' }}>{loading?'⟳':'Подтвердить'}</button>
          <button onClick={()=>{ setStep('creds'); setOtp(''); }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>← Назад</button>
        </>)}
        {step==='setpass'&&(<>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль (мин. 6)" onKeyDown={e=>e.key==='Enter'&&setPass()} style={inp} />
          <button onClick={setPass} disabled={loading||password.length<6} style={{ padding:'13px', background:loading||password.length<6?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:loading||password.length<6?'default':'pointer', fontFamily:'inherit' }}>{loading?'⟳':'Создать аккаунт'}</button>
        </>)}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function Tumba() {
  const [authUser, setAuthUser] = useState<TumbaUser|null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video|null>(null);
  const [tab, setTab] = useState<'home'|'shorts'|'history'|'upload'|'search'>('home');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string|null>(null);
  const CATEGORIES = ['Музыка','Игры','Образование','Спорт','Новости','Технологии','Кулинария','Путешествия','Юмор','Наука'];

  useEffect(()=>{
    db.auth.getSession().then(({data:{session}})=>{
      if (session?.user) setAuthUser({ id:session.user.id, email:session.user.email!, username:session.user.user_metadata?.username });
      setAuthLoading(false);
    });
    const { data:{subscription} } = db.auth.onAuthStateChange((ev,session)=>{
      if (ev==='SIGNED_IN'&&session?.user) setAuthUser({ id:session.user.id, email:session.user.email!, username:session.user.user_metadata?.username });
      else if (ev==='SIGNED_OUT') setAuthUser(null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadVideos = useCallback(async (cat?: string|null, isShort?: boolean) => {
    setVideosLoading(true);
    try {
      const headers = { 'apikey': TUMBA_KEY, 'Authorization': `Bearer ${TUMBA_KEY}` };
      let url = `${TUMBA_URL}/rest/v1/videos?select=*,user_profiles(id,username,display_name,avatar_url,subscribers_count)&is_blocked=eq.false&moderation_status=eq.approved&order=created_at.desc&limit=40`;
      if (cat) url += `&category=eq.${encodeURIComponent(cat)}`;
      if (isShort !== undefined) url += `&is_short=eq.${isShort}`;
      const res = await fetch(url, { headers });
      if (res.ok) { setVideos(await res.json()); }
      else {
        let q = (db.from('videos') as any).select('*, user_profiles(id,username,display_name,avatar_url,subscribers_count)').eq('is_blocked',false).eq('moderation_status','approved').order('created_at',{ascending:false}).limit(40);
        if (cat) q = q.eq('category',cat);
        if (isShort!==undefined) q = q.eq('is_short',isShort);
        const { data } = await q;
        setVideos((data as Video[])||[]);
      }
    } catch { setVideos([]); }
    setVideosLoading(false);
  },[]);

  useEffect(()=>{ loadVideos(selectedCategory, tab==='shorts'?true:undefined); },[tab, selectedCategory, loadVideos]);

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setTab('search'); setVideosLoading(true);
    try {
      const headers = { 'apikey': TUMBA_KEY, 'Authorization': `Bearer ${TUMBA_KEY}` };
      const url = `${TUMBA_URL}/rest/v1/videos?select=*,user_profiles(id,username,display_name,avatar_url)&is_blocked=eq.false&moderation_status=eq.approved&title=ilike.*${encodeURIComponent(searchQ)}*&limit=30`;
      const res = await fetch(url, { headers });
      if (res.ok) setSearchResults(await res.json());
    } catch {}
    setVideosLoading(false);
  };

  if (authLoading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a' }}>
      <div style={{ textAlign:'center', color:'rgba(255,255,255,0.4)' }}>
        <img src={icTumba} style={{ width:64, height:64, marginBottom:12 }} alt="" />
        <div style={{ fontSize:15, fontWeight:600, color:'#fff' }}>Тумба</div>
        <div style={{ fontSize:12, marginTop:6 }}>Загрузка...</div>
      </div>
    </div>
  );

  if (showLogin) return <LoginView onAuth={u=>{ setAuthUser(u); setShowLogin(false); }} onSkip={()=>setShowLogin(false)} />;

  const displayedVideos = tab==='search' ? searchResults : videos;
  const userName = authUser?.username || authUser?.email.split('@')[0] || '';

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#fff', overflow:'hidden' }}>
      <style>{`@keyframes tumba-pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={()=>{ setTab('home'); setSelectedVideo(null); setSelectedCategory(null); }}>
          <img src={icTumba} style={{ width:36, height:36, borderRadius:10 }} alt="" />
          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a' }}>Тумба</div>
        </div>
        <div style={{ flex:1, display:'flex', gap:6, maxWidth:420 }}>
          <div style={{ flex:1, background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:20, display:'flex', alignItems:'center', padding:'0 14px', gap:8 }}>
            <span style={{ color:'#94a3b8', fontSize:14 }}>🔍</span>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
              placeholder="Поиск видео..." style={{ flex:1, border:'none', outline:'none', background:'none', color:'#1e293b', fontSize:13, padding:'8px 0', fontFamily:'inherit' }} />
          </div>
          <button onClick={doSearch} style={{ padding:'0 16px', background:'#ef4444', border:'none', borderRadius:20, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:700, fontFamily:'inherit', boxShadow:'0 3px 8px rgba(239,68,68,0.3)' }}>Найти</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
          {authUser ? (
            <>
              <div style={{ width:34, height:34, borderRadius:'50%', background:avatarBg(userName), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>{initials(userName)}</div>
              <span style={{ fontSize:13, fontWeight:600, color:'#64748b', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</span>
              <button onClick={()=>db.auth.signOut().then(()=>setAuthUser(null))} style={{ padding:'5px 10px', background:'#f1f5f9', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, color:'#64748b', fontFamily:'inherit' }}>Выйти</button>
            </>
          ) : (
            <button onClick={()=>setShowLogin(true)} style={{ padding:'7px 16px', background:'#ef4444', border:'none', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', fontFamily:'inherit' }}>Войти</button>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      {!selectedVideo && (
        <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', display:'flex', overflowX:'auto', flexShrink:0, padding:'0 12px' }}>
          {([
            ['home','🏠 Главная'],
            ['shorts','⚡ Shorts'],
            ...(authUser ? [['history','⏱ История'],['upload','📤 Загрузить']] : []),
          ] as const).map(([t,l])=>(
            <button key={t} onClick={()=>{ setTab(t as any); setSelectedVideo(null); }}
              style={{ padding:'12px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:tab===t?'#ef4444':'#64748b', borderBottom:tab===t?'2px solid #ef4444':'2px solid transparent', whiteSpace:'nowrap', transition:'all 0.12s', fontFamily:'inherit' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Main */}
      {selectedVideo ? (
        <div style={{ flex:1, overflow:'hidden' }}>
          <VideoPlayer video={selectedVideo} userId={authUser?.id} onBack={()=>setSelectedVideo(null)} />
        </div>
      ) : tab==='upload' && authUser ? (
        <div style={{ flex:1, overflow:'hidden' }}>
          <UploadView userId={authUser.id} onDone={()=>{ setTab('home'); loadVideos(); }} />
        </div>
      ) : tab==='history' && authUser ? (
        <div style={{ flex:1, overflowY:'auto' }}>
          <HistoryView userId={authUser.id} onSelect={v=>setSelectedVideo(v)} />
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto' }}>
          {tab!=='shorts' && tab!=='search' && (
            <div style={{ display:'flex', gap:6, padding:'10px 16px', overflowX:'auto', borderBottom:'1px solid #f0f0f0', background:'#fafafa' }}>
              <button onClick={()=>setSelectedCategory(null)} style={{ padding:'5px 14px', borderRadius:20, border:!selectedCategory?'none':'1px solid #e2e8f0', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:!selectedCategory?'#ef4444':'#fff', color:!selectedCategory?'#fff':'#64748b', transition:'all 0.12s', fontFamily:'inherit' }}>🎬 Все</button>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setSelectedCategory(selectedCategory===c?null:c)} style={{ padding:'5px 14px', borderRadius:20, border:selectedCategory===c?'none':'1px solid #e2e8f0', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:selectedCategory===c?'#ef4444':'#fff', color:selectedCategory===c?'#fff':'#64748b', transition:'all 0.12s', fontFamily:'inherit' }}>{c}</button>
              ))}
            </div>
          )}
          <div style={{ padding:'16px' }}>
            {tab==='search' && <div style={{ fontSize:14, fontWeight:600, color:'#64748b', marginBottom:16 }}>🔍 «{searchQ}» — {displayedVideos.length} видео</div>}
            {videosLoading && <SkeletonGrid />}
            {!videosLoading && displayedVideos.length===0 && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>▶</div>
                <div style={{ fontSize:15, fontWeight:600 }}>Видео не найдено</div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:tab==='shorts'?'repeat(auto-fill,minmax(160px,1fr))':'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
              {displayedVideos.map(video=>(
                <VideoCard key={video.id} video={video} onClick={()=>setSelectedVideo(video)} userId={authUser?.id} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
