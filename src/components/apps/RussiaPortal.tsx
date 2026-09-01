import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WebApp from '@/components/apps/WebApp';

const YA_RUSSIA_URL = 'https://preview-react-9bi4d2-57mcf7tzxcpunfzwstannu.onspace.build/?_q=57McF7TzxCpuNfzWSTaNnu';

interface IndexValue {
  id: string;
  index_key: string;
  value: number;
  recorded_date: string;
}

interface IndexNews {
  id: string;
  index_key: string;
  title: string;
  content?: string;
  impact: string;
  published_at: string;
}

interface ChannelPost {
  id: string;
  channel_id: string;
  title: string;
  content?: string;
  link?: string;
  published_at: string;
}

type PortalTab = 'analytics' | 'news' | 'regions' | 'agro' | 'industry' | 'primakov' | 'rosstat';

const INDEX_CONFIG: Record<string, { name: string; color: string; desc: string }> = {
  agro:     { name: 'Агроиндекс',           color: '#22c55e', desc: 'Сельскохозяйственный индекс России' },
  industry: { name: 'Промышленный индекс',  color: '#3b82f6', desc: 'Промышленное производство' },
  primakov: { name: 'Индекс Примакова',     color: '#8b5cf6', desc: 'Деловая активность' },
  rosstat:  { name: 'Индекс Росстат',       color: '#f59e0b', desc: 'Официальный статистический индекс' },
};

const IMPACT_COLORS: Record<string, string> = { positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' };
const IMPACT_LABELS: Record<string, string> = { positive: '↑ Позитив', negative: '↓ Негатив', neutral: '→ Нейтрально' };

function MiniChart({ values, color }: { values: IndexValue[]; color: string }) {
  if (values.length < 2) return null;
  const nums = values.map(v => v.value);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const W = 280, H = 80;
  const points = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 10) - 4;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${H} ${points} ${W},${H}`;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad_${color.replace('#','')})`}/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {nums.map((v, i) => {
        const x = (i / (nums.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 10) - 4;
        return <circle key={i} cx={x} cy={y} r="4" fill={color} />;
      })}
    </svg>
  );
}

function IndexPanel({ indexKey, isAdmin }: { indexKey: string; isAdmin: boolean }) {
  const cfg = INDEX_CONFIG[indexKey];
  const [values, setValues] = useState<IndexValue[]>([]);
  const [news, setNews] = useState<IndexNews[]>([]);
  const [addingNews, setAddingNews] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', content: '', impact: 'neutral' });
  const [addingValue, setAddingValue] = useState(false);
  const [newVal, setNewVal] = useState({ value: '', recorded_date: new Date().toISOString().slice(0, 10) });
  const { user } = useAuth();

  useEffect(() => {
    supabase.from('index_values').select('*').eq('index_key', indexKey).order('recorded_date').then(({ data }) => setValues((data as IndexValue[]) || []));
    supabase.from('index_news').select('*').eq('index_key', indexKey).order('published_at', { ascending: false }).limit(20).then(({ data }) => setNews((data as IndexNews[]) || []));
  }, [indexKey]);

  const addValue = async () => {
    if (!newVal.value || !newVal.recorded_date) return;
    const { data } = await supabase.from('index_values').insert({ index_key: indexKey, value: parseFloat(newVal.value), recorded_date: newVal.recorded_date }).select().single();
    if (data) setValues(p => [...p, data as IndexValue].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date)));
    setNewVal({ value: '', recorded_date: new Date().toISOString().slice(0, 10) });
    setAddingValue(false);
  };

  const addNewsItem = async () => {
    if (!newNews.title.trim() || !user) return;
    const { data } = await supabase.from('index_news').insert({ index_key: indexKey, title: newNews.title.trim(), content: newNews.content, impact: newNews.impact, created_by: user.id }).select().single();
    if (data) setNews(p => [data as IndexNews, ...p]);
    setNewNews({ title: '', content: '', impact: 'neutral' });
    setAddingNews(false);
  };

  const latestValue = values[values.length - 1];
  const prevValue = values[values.length - 2];
  const change = latestValue && prevValue ? latestValue.value - prevValue.value : 0;
  const changePct = prevValue ? ((change / prevValue.value) * 100).toFixed(2) : '0.00';

  const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Segoe UI, sans-serif' };

  return (
    <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
      {/* Header card */}
      <div style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}08)`, border: `1px solid ${cfg.color}40`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{cfg.name}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{cfg.desc}</div>
        </div>
        {latestValue && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: cfg.color }}>{latestValue.value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</div>
            <div style={{ fontSize: 13, color: change >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)} ({changePct}%)
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(latestValue.recorded_date).toLocaleDateString('ru-RU')}</div>
          </div>
        )}
      </div>

      {/* Chart */}
      {values.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>График значений</div>
          <MiniChart values={values} color={cfg.color} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            <span>{values[0] && new Date(values[0].recorded_date).toLocaleDateString('ru-RU')}</span>
            <span>{latestValue && new Date(latestValue.recorded_date).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      )}

      {/* Admin: add value */}
      {isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: addingValue ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📊 Добавить значение</div>
            <button onClick={() => setAddingValue(v => !v)} style={{ padding: '5px 14px', background: cfg.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
              {addingValue ? 'Свернуть' : '+ Добавить'}
            </button>
          </div>
          {addingValue && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Дата</label>
                <input type="date" value={newVal.recorded_date} onChange={e => setNewVal(p => ({ ...p, recorded_date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Значение</label>
                <input type="number" step="0.01" value={newVal.value} onChange={e => setNewVal(p => ({ ...p, value: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </div>
              <button onClick={addValue} style={{ padding: '9px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>✓</button>
            </div>
          )}
        </div>
      )}

      {/* News */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📰 Новости по индексу</div>
          {isAdmin && <button onClick={() => setAddingNews(v => !v)} style={{ padding: '5px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>+ Добавить</button>}
        </div>
        {isAdmin && addingNews && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={newNews.title} onChange={e => setNewNews(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="Заголовок новости *" />
            <textarea value={newNews.content} onChange={e => setNewNews(p => ({ ...p, content: e.target.value }))} style={{ ...inputStyle, height: 60, resize: 'none' }} placeholder="Текст новости" />
            <div style={{ display: 'flex', gap: 10 }}>
              <select value={newNews.impact} onChange={e => setNewNews(p => ({ ...p, impact: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
                <option value="positive">↑ Позитивное</option>
                <option value="negative">↓ Негативное</option>
                <option value="neutral">→ Нейтральное</option>
              </select>
              <button onClick={addNewsItem} style={{ padding: '8px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>✓ Сохранить</button>
              <button onClick={() => setAddingNews(false)} style={{ padding: '8px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Отмена</button>
            </div>
          </div>
        )}
        {news.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Нет новостей по данному индексу</div>
        ) : news.map(n => (
          <div key={n.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: IMPACT_COLORS[n.impact], background: IMPACT_COLORS[n.impact] + '15', padding: '2px 8px', borderRadius: 6, flexShrink: 0, marginTop: 2 }}>{IMPACT_LABELS[n.impact]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{n.title}</div>
                {n.content && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{n.content}</div>}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{new Date(n.published_at).toLocaleString('ru-RU')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LiveMacroWidgets ────────────────────────────────────────
function LiveMacroWidgets() {
  interface MacroVal { value: number; recorded_date: string; }
  const [gdp, setGdp]       = useState<MacroVal | null>(null);
  const [rate, setRate]     = useState<MacroVal | null>(null);
  const [zvr, setZvr]       = useState<MacroVal | null>(null);
  const [animated, setAnimated] = useState<Record<string,boolean>>({});
  const prevRef = useRef<Record<string, number>>({});

  const loadMacro = async () => {
    const fetch3 = async (key: string) => {
      const { data } = await supabase
        .from('index_values')
        .select('value, recorded_date')
        .eq('index_key', key)
        .order('recorded_date', { ascending: false })
        .limit(1)
        .single();
      return data as MacroVal | null;
    };
    const [g, r, z] = await Promise.all([fetch3('gdp'), fetch3('cb_rate'), fetch3('zvr')]);
    const animate: Record<string, boolean> = {};
    if (g && prevRef.current.gdp !== undefined && g.value !== prevRef.current.gdp) animate.gdp = true;
    if (r && prevRef.current.rate !== undefined && r.value !== prevRef.current.rate) animate.rate = true;
    if (z && prevRef.current.zvr !== undefined && z.value !== prevRef.current.zvr) animate.zvr = true;
    if (Object.keys(animate).length) { setAnimated(animate); setTimeout(() => setAnimated({}), 900); }
    if (g) { setGdp(g); prevRef.current.gdp = g.value; }
    if (r) { setRate(r); prevRef.current.rate = r.value; }
    if (z) { setZvr(z); prevRef.current.zvr = z.value; }
  };

  useEffect(() => {
    loadMacro();
    const t = setInterval(loadMacro, 60000);
    return () => clearInterval(t);
  }, []);

  const widgets = [
    { key: 'gdp',  label: 'ВВП 2026',  icon: '📈', color: '#1565c0',
      value: gdp  ? `₽${(gdp.value / 1000).toFixed(1)} трлн` : '—',
      sub:   gdp  ? new Date(gdp.recorded_date).toLocaleDateString('ru-RU')  : 'нет данных' },
    { key: 'rate', label: 'Ставка ЦБ', icon: '🏦', color: '#7c3aed',
      value: rate ? `${rate.value}%` : '—',
      sub:   rate ? new Date(rate.recorded_date).toLocaleDateString('ru-RU') : 'нет данных' },
    { key: 'zvr',  label: 'ЗВР',       icon: '🏅', color: '#b45309',
      value: zvr  ? `$${zvr.value.toFixed(1)} млрд` : '—',
      sub:   zvr  ? new Date(zvr.recorded_date).toLocaleDateString('ru-RU')  : 'нет данных' },
  ];

  return (
    <>
      <style>{`@keyframes macro-pulse{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}`}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        {widgets.map(w => (
          <div key={w.key} style={{
            background:`linear-gradient(135deg,${w.color}18,${w.color}06)`,
            border:`1.5px solid ${w.color}35`, borderRadius:14, padding:'14px 16px',
            animation: (animated as Record<string,boolean>)[w.key] ? 'macro-pulse 0.9s ease' : 'none',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:22}}>{w.icon}</span>
              <span style={{fontSize:12,fontWeight:600,color:'#64748b'}}>{w.label}</span>
            </div>
            <div style={{fontSize:24,fontWeight:800,color:w.color,letterSpacing:-0.5}}>{w.value}</div>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Обновлено: {w.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Regions Tab ─────────────────────────────────────────────
const REGIONS = [
  { name: 'Москва', icon: '🏙️', vrp: 24800, salary: 112000, pop: 13.0, industry: 'Финансы · IT · Торговля', growth: 3.2 },
  { name: 'Санкт-Петербург', icon: '🌊', vrp: 7200, salary: 85000, pop: 5.6, industry: 'Туризм · Промышленность · Наука', growth: 2.8 },
  { name: 'Московская область', icon: '🏘️', vrp: 5800, salary: 78000, pop: 8.7, industry: 'Строительство · Логистика · IT', growth: 2.5 },
  { name: 'Краснодарский край', icon: '🌴', vrp: 3100, salary: 58000, pop: 6.0, industry: 'Сельское хозяйство · Туризм', growth: 2.1 },
  { name: 'Свердловская область', icon: '⚙️', vrp: 2900, salary: 64000, pop: 4.3, industry: 'Металлургия · Машиностроение', growth: 1.9 },
  { name: 'Татарстан', icon: '🛢️', vrp: 2700, salary: 63000, pop: 4.0, industry: 'Нефтепереработка · Автомобилестроение', growth: 2.3 },
  { name: 'Ханты-Мансийский АО', icon: '🛢️', vrp: 5200, salary: 92000, pop: 1.7, industry: 'Добыча нефти и газа', growth: 1.4 },
  { name: 'Нижегородская область', icon: '🚗', vrp: 1900, salary: 59000, pop: 3.1, industry: 'Автомобилестроение · Химия · IT', growth: 1.7 },
  { name: 'Красноярский край', icon: '❄️', vrp: 2400, salary: 67000, pop: 2.9, industry: 'Металлургия · Добыча · Энергетика', growth: 1.5 },
  { name: 'Башкортостан', icon: '🏔️', vrp: 1700, salary: 57000, pop: 4.1, industry: 'Нефтехимия · Сельское хозяйство', growth: 1.8 },
];

function RegionDetail({ region, onBack }: { region: typeof REGIONS[0]; onBack: () => void }) {
  const maxSalary = Math.max(...REGIONS.map(r => r.salary));
  const maxVrp    = Math.max(...REGIONS.map(r => r.vrp));
  return (
    <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
      <button onClick={onBack} style={{ padding: '6px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>◀ Назад к регионам</button>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a237e,#1565c0)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff', display: 'flex', gap: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 52 }}>{region.icon}</span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{region.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{region.industry}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Рост ВРП</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#86efac' }}>+{region.growth}%</div>
        </div>
      </div>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'ВРП 2026', value: `${region.vrp.toLocaleString('ru-RU')} млрд ₽`, color: '#1565c0', icon: '📈' },
          { label: 'Средняя зарплата', value: `${region.salary.toLocaleString('ru-RU')} ₽`, color: '#7c3aed', icon: '💰' },
          { label: 'Население', value: `${region.pop} млн`, color: '#065f46', icon: '👥' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#fff', border: `1.5px solid ${m.color}25`, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: '💰 Зарплата относительно лидера', value: region.salary / maxSalary, color: '#7c3aed', fmt: `${region.salary.toLocaleString('ru-RU')} ₽ / ${maxSalary.toLocaleString('ru-RU')} ₽` },
          { label: '📊 ВРП относительно лидера', value: region.vrp / maxVrp, color: '#1565c0', fmt: `${region.vrp.toLocaleString('ru-RU')} / ${maxVrp.toLocaleString('ru-RU')} млрд ₽` },
        ].map((bar, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>{bar.label}</div>
            <div style={{ background: '#f1f5f9', borderRadius: 20, height: 10, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${bar.value * 100}%`, background: `linear-gradient(90deg,${bar.color},${bar.color}bb)`, borderRadius: 20, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{bar.fmt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionsTab() {
  const [selected, setSelected] = useState<typeof REGIONS[0] | null>(null);
  const [liveData, setLiveData]  = useState<Record<string, number>>({});
  const [animated, setAnimated]  = useState<Record<string, boolean>>({});
  const prevRef = React.useRef<Record<string, number>>({});

  const loadLiveData = async () => {
    const keys = ['gdp_msk', 'gdp_spb', 'cb_rate', 'zvr'];
    const results = await Promise.all(keys.map(k =>
      supabase.from('index_values').select('value').eq('index_key', k)
        .order('recorded_date', { ascending: false }).limit(1).single()
        .then(({ data }) => [k, data?.value ?? null] as [string, number | null])
    ));
    const newData: Record<string, number> = {};
    const anim: Record<string, boolean> = {};
    results.forEach(([k, v]) => {
      if (v !== null) {
        if (prevRef.current[k] !== undefined && prevRef.current[k] !== v) anim[k] = true;
        newData[k] = v;
        prevRef.current[k] = v;
      }
    });
    if (Object.keys(anim).length > 0) {
      setAnimated(anim);
      setTimeout(() => setAnimated({}), 900);
    }
    setLiveData(newData);
  };

  React.useEffect(() => {
    loadLiveData();
    const t = setInterval(loadLiveData, 60000);
    return () => clearInterval(t);
  }, []);

  // Inject live data into first 2 regions (Moscow, SPb)
  const regionsWithLive = REGIONS.map((r, i) => {
    if (i === 0 && liveData.gdp_msk) return { ...r, vrp: Math.round(liveData.gdp_msk) };
    if (i === 1 && liveData.gdp_spb) return { ...r, vrp: Math.round(liveData.gdp_spb) };
    return r;
  });

  if (selected) return <RegionDetail region={selected} onBack={() => setSelected(null)} />;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🗺️ Регионы России — Экономика 2026</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>10 крупнейших регионов по ВРП. Нажмите для детального вида.</div>
        {liveData.cb_rate && (
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, animation: animated.cb_rate ? 'macro-pulse 0.9s ease' : 'none' }}>
            <span style={{ fontSize: 18 }}>🏦</span>
            <span style={{ fontSize: 13, color: '#c4b5fd' }}>Ставка ЦБ РФ:</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>{liveData.cb_rate}%</span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>· обновляется каждые 60 сек</span>
          </div>
        )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {regionsWithLive.map((r, i) => (
          <div key={i} onClick={() => setSelected(r)}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(21,101,192,0.15)'; e.currentTarget.style.borderColor = '#93c5fd'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 30 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.industry.split(' · ')[0]}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Рост</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>+{r.growth}%</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'ВРП', value: `${(r.vrp / 1000).toFixed(1)} трлн`, color: '#1565c0' },
                { label: 'Зарплата', value: `${Math.round(r.salary/1000)}K ₽`, color: '#7c3aed' },
                { label: 'Население', value: `${r.pop} млн`, color: '#065f46' },
              ].map((m, j) => (
                <div key={j} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RussiaPortal() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<PortalTab>('analytics');
  const [newsPosts, setNewsPosts] = useState<ChannelPost[]>([]);
  const [indexSummary, setIndexSummary] = useState<Record<string, { latest: number; change: number }>>({});

  useEffect(() => {
    // Load general news from channels
    supabase.from('channel_posts').select('*').order('published_at', { ascending: false }).limit(30).then(({ data }) => setNewsPosts((data as ChannelPost[]) || []));
    // Load latest index values for summary widget
    const keys = ['agro', 'industry', 'primakov', 'rosstat'];
    keys.forEach(k => {
      supabase.from('index_values').select('value, recorded_date').eq('index_key', k).order('recorded_date', { ascending: false }).limit(2)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const latest = data[0].value;
            const prev = data[1]?.value || latest;
            setIndexSummary(p => ({ ...p, [k]: { latest, change: latest - prev } }));
          }
        });
    });
  }, []);

  const TABS: { id: PortalTab; label: string }[] = [
    { id: 'analytics', label: '📊 Я-Россия' },
    { id: 'news', label: '📰 Новости' },
    { id: 'regions', label: '🗺️ Регионы' },
    { id: 'agro', label: '🌾 Агроиндекс' },
    { id: 'industry', label: '🏭 Промышленный' },
    { id: 'primakov', label: '📈 Примакова' },
    { id: 'rosstat', label: '📊 Росстат' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#f0f4f8', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)', flexShrink: 0 }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Russian flag mini */}
          <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '33.3%', background: '#fff' }} />
            <div style={{ height: '33.3%', background: '#1565c0' }} />
            <div style={{ height: '33.3%', background: '#dc2626' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>Я-Россия</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Внутренний информационный портал · Биржа · Индексы</div>
          </div>
          {/* Quick index summary */}
          <div style={{ display: 'flex', gap: 12 }}>
            {Object.entries(indexSummary).slice(0, 3).map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>{INDEX_CONFIG[k]?.name.split(' ')[0]}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{v.latest.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
                <div style={{ fontSize: 10, color: v.change >= 0 ? '#86efac' : '#fca5a5' }}>{v.change >= 0 ? '▲' : '▼'} {Math.abs(v.change).toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Segoe UI, sans-serif',
              background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'none',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.6)',
              borderBottom: tab === t.id ? '2px solid #93c5fd' : '2px solid transparent',
              fontWeight: tab === t.id ? 700 : 400, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'analytics' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <WebApp url={YA_RUSSIA_URL} title="Я-Россия: Аналитика" icon="📊" />
          </div>
        )}
        {tab === 'news' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <LiveMacroWidgets />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Последние новости</div>
            {newsPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>📰</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Нет новостей</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Новости добавляются через каналы мессенджера</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {newsPosts.map(post => (
                  <div key={post.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{post.title}</div>
                    {post.content && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>{post.content.replace(/<[^>]*>/g, '').slice(0, 300)}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(post.published_at).toLocaleString('ru-RU')}</div>
                      {post.link && <a href={post.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6' }}>🔗 Источник</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'regions' && <RegionsTab />}
        {(tab === 'agro' || tab === 'industry' || tab === 'primakov' || tab === 'rosstat') && (
          <IndexPanel indexKey={tab} isAdmin={!!isAdmin} />
        )}
      </div>
    </div>
  );
}
