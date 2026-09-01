import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import icSun   from '@/assets/icons/weather-sun.png';
import icCloud from '@/assets/icons/weather-cloud.png';
import icRain  from '@/assets/icons/weather-rain.png';
import icSnow  from '@/assets/icons/weather-snow.png';

interface WeatherData {
  temp: number;
  desc: string;
  icon: string;
  wind: number;
  humidity: number;
}

const WEATHER_ICONS: Record<string, string> = {
  Clear: icSun, Clouds: icCloud, Rain: icRain, Drizzle: icRain,
  Snow: icSnow, Thunderstorm: icRain, Mist: icCloud, Fog: icCloud, Haze: icCloud,
};

const WEATHER_DESCS: Record<string, string> = {
  Clear: 'Ясно', Clouds: 'Облачно', Rain: 'Дождь', Drizzle: 'Морось',
  Snow: 'Снег', Thunderstorm: 'Гроза', Mist: 'Туман', Fog: 'Туман', Haze: 'Дымка',
};

export default function DesktopClock() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState('Москва');
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState('Москва');
  const [weatherError, setWeatherError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load saved city from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('weather_city').eq('id', user.id).single().then(({ data }) => {
      if (data?.weather_city) { setCity(data.weather_city); setCityInput(data.weather_city); }
    });
  }, [user]);

  const fetchWeather = useCallback(async (cityName: string) => {
    setLoading(true);
    setWeatherError('');
    try {
      // Step 1: geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru&format=json`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!geoRes.ok) throw new Error('Geocoding error');
      const geoData = await geoRes.json();
      if (!geoData.results?.length) {
        setWeatherError('Город не найден');
        setLoading(false);
        return;
      }
      const { latitude, longitude } = geoData.results[0];
      // Step 2: weather
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        wind_speed_unit: 'ms',
        timezone: 'auto',
      });
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!wRes.ok) throw new Error('Weather API error');
      const wData = await wRes.json();
      const cur = wData.current;
      if (!cur) throw new Error('No current data');
      const code: number = cur.weather_code ?? 0;
      let condition = 'Clear';
      if (code === 0) condition = 'Clear';
      else if ([1,2,3].includes(code)) condition = 'Clouds';
      else if ([51,53,55,61,63,65,80,81,82].includes(code)) condition = 'Rain';
      else if ([71,73,75,77,85,86].includes(code)) condition = 'Snow';
      else if ([95,96,99].includes(code)) condition = 'Thunderstorm';
      else if ([45,48].includes(code)) condition = 'Fog';
      else if (code <= 3) condition = 'Clouds';
      setWeather({
        temp: Math.round(cur.temperature_2m ?? 0),
        desc: WEATHER_DESCS[condition] || condition,
        icon: condition,
        wind: Math.round(cur.wind_speed_10m ?? 0),
        humidity: cur.relative_humidity_2m ?? 0,
      });
      setWeatherError('');
    } catch (e: any) {
      console.error('Weather fetch error:', e);
      setWeatherError('Нет данных');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWeather(city); const t = setInterval(() => fetchWeather(city), 30 * 60 * 1000); return () => clearInterval(t); }, [city, fetchWeather]);

  const saveCity = async () => {
    const c = cityInput.trim();
    if (!c) return;
    setCity(c);
    setEditingCity(false);
    if (user) await supabase.from('user_profiles').update({ weather_city: c }).eq('id', user.id);
    fetchWeather(c);
  };

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const weatherIcon = weather ? (WEATHER_ICONS[weather.icon] || icSun) : null;

  return (
    <div style={{
      position: 'absolute', top: 20, right: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      pointerEvents: 'auto', zIndex: 100,
    }}>
      {/* Clock */}
      <div style={{
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16,
        padding: '12px 20px', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 52, fontWeight: 200, color: '#fff', fontFamily: "'Segoe UI Light', 'Segoe UI', sans-serif", letterSpacing: 2, lineHeight: 1, textShadow: '0 2px 12px rgba(100,180,255,0.5)' }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontFamily: 'Segoe UI, sans-serif', letterSpacing: 1 }}>
          {dateStr}
        </div>
      </div>

      {/* Weather widget */}
      <div style={{
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14,
        padding: '10px 16px', minWidth: 160,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {!editingCity ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {weatherIcon && <img src={weatherIcon} width={36} height={36} style={{ display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />}
              <div>
                {weather ? (
                  <>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: 'Segoe UI, sans-serif' }}>{weather.temp}°</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{weather.desc}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{loading ? '⟳ Загрузка...' : weatherError || '—'}</div>
                )}
              </div>
            </div>
            {weather && (
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                <span>💧 {weather.humidity}%</span>
                <span>💨 {weather.wind} м/с</span>
              </div>
            )}
            <button onClick={() => { setEditingCity(true); setCityInput(city); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 0', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif', textAlign: 'center' }}>
              📍 {city}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Segoe UI, sans-serif' }}>Введите город:</div>
            <input
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCity(); if (e.key === 'Escape') setEditingCity(false); }}
              autoFocus
              style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Segoe UI, sans-serif' }}
              placeholder="Например: Кострома"
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={saveCity} style={{ flex: 1, padding: '5px', background: 'rgba(59,130,246,0.8)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ OK</button>
              <button onClick={() => setEditingCity(false)} style={{ flex: 1, padding: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
