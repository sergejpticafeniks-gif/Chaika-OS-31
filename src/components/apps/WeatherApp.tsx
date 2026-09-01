/**
 * Чайка ОС — Погода
 * Реальные данные: open-meteo.com + geocoding-api.open-meteo.com
 */
import React, { useState, useEffect, useCallback } from 'react';

interface GeoResult { name: string; latitude: number; longitude: number; country: string; admin1?: string; }
interface Current { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; }
interface Daily { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_sum: number[]; }
interface HourlyItem { time: string; temp: number; code: number; }

const WMO: Record<number, { icon: string; label: string }> = {
  0:   { icon: '☀️', label: 'Ясно' },
  1:   { icon: '🌤️', label: 'Преимущественно ясно' },
  2:   { icon: '⛅', label: 'Переменная облачность' },
  3:   { icon: '☁️', label: 'Пасмурно' },
  45:  { icon: '🌫️', label: 'Туман' },
  48:  { icon: '🌫️', label: 'Изморозь' },
  51:  { icon: '🌦️', label: 'Лёгкая морось' },
  53:  { icon: '🌧️', label: 'Морось' },
  55:  { icon: '🌧️', label: 'Сильная морось' },
  61:  { icon: '🌧️', label: 'Слабый дождь' },
  63:  { icon: '🌧️', label: 'Умеренный дождь' },
  65:  { icon: '🌧️', label: 'Сильный дождь' },
  71:  { icon: '🌨️', label: 'Лёгкий снег' },
  73:  { icon: '❄️', label: 'Умеренный снег' },
  75:  { icon: '❄️', label: 'Сильный снег' },
  80:  { icon: '🌦️', label: 'Ливень' },
  95:  { icon: '⛈️', label: 'Гроза' },
  99:  { icon: '⛈️', label: 'Гроза с градом' },
};

const getWmo = (code: number) => WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { icon: '🌡️', label: 'Неизвестно' };

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function WeatherApp() {
  const [city, setCity]             = useState('Москва');
  const [query, setQuery]           = useState('');
  const [geo, setGeo]               = useState<GeoResult | null>(null);
  const [current, setCurrent]       = useState<Current | null>(null);
  const [daily, setDaily]           = useState<Daily | null>(null);
  const [hourly, setHourly]         = useState<HourlyItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [suggestions, setSugg]      = useState<GeoResult[]>([]);
  const [showSugg, setShowSugg]     = useState(false);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code');
    url.searchParams.set('hourly', 'temperature_2m,weather_code');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    const res  = await fetch(url.toString());
    const data = await res.json();

    setCurrent(data.current as Current);
    setDaily(data.daily as Daily);

    // Take next 12 hourly from now
    const nowH  = new Date().getHours();
    const times: HourlyItem[] = (data.hourly.time as string[])
      .slice(nowH, nowH + 12)
      .map((t: string, i: number) => ({
        time: t,
        temp: (data.hourly.temperature_2m as number[])[nowH + i],
        code: (data.hourly.weather_code as number[])[nowH + i],
      }));
    setHourly(times);
  }, []);

  const searchCity = useCallback(async (q: string) => {
    if (!q.trim()) { setSugg([]); return; }
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=ru`);
    const data = await res.json();
    setSugg((data.results ?? []) as GeoResult[]);
    setShowSugg(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent('Москва')}&count=1&language=ru`)
      .then(r => r.json())
      .then(d => {
        const g = d.results?.[0] as GeoResult;
        if (g) { setGeo(g); return fetchWeather(g.latitude, g.longitude); }
      })
      .catch(() => setError('Не удалось получить данные'))
      .finally(() => setLoading(false));
  }, []);

  const selectCity = async (g: GeoResult) => {
    setGeo(g);
    setCity(g.name);
    setQuery(g.name);
    setSugg([]);
    setShowSugg(false);
    setLoading(true);
    setError(null);
    try { await fetchWeather(g.latitude, g.longitude); }
    catch { setError('Ошибка загрузки погоды'); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(null);
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=ru`);
    const data = await res.json();
    const g    = data.results?.[0] as GeoResult;
    if (g) await selectCity(g);
    else setError(`Город "${q}" не найден`);
    setLoading(false);
  };

  const wmo = current ? getWmo(current.weather_code) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#0c1445 0%,#1a237e 40%,#283593 100%)', fontFamily: "'Segoe UI', sans-serif", color: '#fff', overflow: 'hidden' }}>
      {/* Search bar */}
      <div style={{ padding: '16px 20px', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); searchCity(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Введите город..."
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            {showSugg && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1e3a5f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectCity(s)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.07)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 8, fontSize: 11 }}>{s.admin1}, {s.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSearch} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            🔍
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⟳</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div><div style={{ fontSize: 16 }}>{error}</div></div>
        </div>
      )}

      {!loading && !error && current && geo && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {/* Main weather card */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 80, marginBottom: 4, lineHeight: 1 }}>{wmo?.icon}</div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{Math.round(current.temperature_2m)}°</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{geo.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{wmo?.label}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Ощущается как {Math.round(current.apparent_temperature)}°</div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '💧', label: 'Влажность', value: `${current.relative_humidity_2m}%` },
              { icon: '🌬️', label: 'Ветер', value: `${Math.round(current.wind_speed_10m)} км/ч` },
              { icon: '🌡️', label: 'Ощущается', value: `${Math.round(current.apparent_temperature)}°C` },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Hourly forecast */}
          {hourly.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 0', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', padding: '0 16px', marginBottom: 10 }}>По часам</div>
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '0 12px', scrollbarWidth: 'none' }}>
                {hourly.map((h, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 58, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: i === 0 ? 'rgba(255,255,255,0.15)' : 'none' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                      {i === 0 ? 'Сейчас' : new Date(h.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{getWmo(h.code).icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(h.temp)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-day forecast */}
          {daily && (
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>7 дней</div>
              {daily.time.map((t, i) => {
                const d  = new Date(t);
                const wd = DAYS[d.getDay()];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <div style={{ width: 28, fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>{i === 0 ? 'Сег.' : wd}</div>
                    <div style={{ fontSize: 20 }}>{getWmo(daily.weather_code[i]).icon}</div>
                    <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{daily.precipitation_sum[i] > 0 ? `💧 ${daily.precipitation_sum[i].toFixed(0)}мм` : ''}</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{Math.round(daily.temperature_2m_min[i])}°</div>
                    <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: '60%', background: '#60a5fa', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(daily.temperature_2m_max[i])}°</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
