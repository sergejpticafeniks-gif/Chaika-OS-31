/**
 * Чайка ОС — Конвертер единиц
 */
import React, { useState, useCallback } from 'react';

type Category = 'length' | 'weight' | 'temp' | 'area' | 'volume' | 'speed' | 'time';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'length', label: 'Длина', icon: '📏' },
  { id: 'weight', label: 'Масса', icon: '⚖️' },
  { id: 'temp', label: 'Температура', icon: '🌡️' },
  { id: 'area', label: 'Площадь', icon: '▫️' },
  { id: 'volume', label: 'Объём', icon: '🧊' },
  { id: 'speed', label: 'Скорость', icon: '💨' },
  { id: 'time', label: 'Время', icon: '⏱️' },
];

type Units = Record<string, { label: string; toBase: (v: number) => number; fromBase: (v: number) => number }>;

const UNITS: Record<Category, Units> = {
  length: {
    mm:  { label: 'Миллиметр (мм)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    cm:  { label: 'Сантиметр (см)', toBase: v => v / 100, fromBase: v => v * 100 },
    m:   { label: 'Метр (м)',       toBase: v => v, fromBase: v => v },
    km:  { label: 'Километр (км)',  toBase: v => v * 1000, fromBase: v => v / 1000 },
    in:  { label: 'Дюйм (in)',      toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    ft:  { label: 'Фут (ft)',       toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    yd:  { label: 'Ярд (yd)',       toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    mi:  { label: 'Миля (mi)',      toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    nm:  { label: 'Морская миля',   toBase: v => v * 1852, fromBase: v => v / 1852 },
  },
  weight: {
    mg:  { label: 'Миллиграмм (мг)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    g:   { label: 'Грамм (г)',        toBase: v => v / 1000, fromBase: v => v * 1000 },
    kg:  { label: 'Килограмм (кг)',   toBase: v => v, fromBase: v => v },
    t:   { label: 'Тонна (т)',        toBase: v => v * 1000, fromBase: v => v / 1000 },
    lb:  { label: 'Фунт (lb)',        toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
    oz:  { label: 'Унция (oz)',       toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
    st:  { label: 'Стоун (st)',       toBase: v => v * 6.35029, fromBase: v => v / 6.35029 },
  },
  temp: {
    c:   { label: 'Цельсий (°C)',    toBase: v => v, fromBase: v => v },
    f:   { label: 'Фаренгейт (°F)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    k:   { label: 'Кельвин (K)',     toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  },
  area: {
    mm2: { label: 'мм²',  toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    cm2: { label: 'см²',  toBase: v => v / 1e4, fromBase: v => v * 1e4 },
    m2:  { label: 'м²',   toBase: v => v, fromBase: v => v },
    km2: { label: 'км²',  toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    ha:  { label: 'Гектар', toBase: v => v * 1e4, fromBase: v => v / 1e4 },
    ac:  { label: 'Акр',  toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
    ft2: { label: 'фут²', toBase: v => v * 0.092903, fromBase: v => v / 0.092903 },
  },
  volume: {
    ml:  { label: 'Миллилитр (мл)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    cl:  { label: 'Сантилитр (сл)', toBase: v => v / 100, fromBase: v => v * 100 },
    l:   { label: 'Литр (л)',       toBase: v => v, fromBase: v => v },
    m3:  { label: 'Кубометр (м³)',  toBase: v => v * 1000, fromBase: v => v / 1000 },
    gal: { label: 'Галлон (gal)',   toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    oz_fl:{ label: 'Флюид. унция', toBase: v => v * 0.0295735, fromBase: v => v / 0.0295735 },
    cup: { label: 'Чашка (cup)',    toBase: v => v * 0.236588, fromBase: v => v / 0.236588 },
  },
  speed: {
    ms:   { label: 'м/с',     toBase: v => v, fromBase: v => v },
    kmh:  { label: 'км/ч',    toBase: v => v / 3.6, fromBase: v => v * 3.6 },
    mph:  { label: 'миль/ч',  toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
    kn:   { label: 'Узел',    toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
    mach: { label: 'Мах',     toBase: v => v * 340, fromBase: v => v / 340 },
  },
  time: {
    ms:  { label: 'Миллисекунда', toBase: v => v / 1000, fromBase: v => v * 1000 },
    s:   { label: 'Секунда',     toBase: v => v, fromBase: v => v },
    min: { label: 'Минута',      toBase: v => v * 60, fromBase: v => v / 60 },
    h:   { label: 'Час',         toBase: v => v * 3600, fromBase: v => v / 3600 },
    d:   { label: 'День',        toBase: v => v * 86400, fromBase: v => v / 86400 },
    wk:  { label: 'Неделя',      toBase: v => v * 604800, fromBase: v => v / 604800 },
    mo:  { label: 'Месяц (~30д)',toBase: v => v * 2592000, fromBase: v => v / 2592000 },
    yr:  { label: 'Год (~365д)', toBase: v => v * 31536000, fromBase: v => v / 31536000 },
  },
};

export default function UnitConverter() {
  const [cat, setCat] = useState<Category>('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [fromVal, setFromVal] = useState('1');
  const [history, setHistory] = useState<string[]>([]);

  const units = UNITS[cat];

  const convert = useCallback((val: string, from: string, to: string): string => {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    const base = units[from]?.toBase(n);
    if (base === undefined) return '';
    const result = units[to]?.fromBase(base);
    if (result === undefined) return '';
    return result.toPrecision(8).replace(/\.?0+$/, '');
  }, [units]);

  const result = convert(fromVal, fromUnit, toUnit);

  const handleCat = (c: Category) => {
    setCat(c);
    const keys = Object.keys(UNITS[c]);
    setFromUnit(keys[0]);
    setToUnit(keys[1] || keys[0]);
    setFromVal('1');
  };

  const swap = () => {
    const tmp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tmp);
    if (result) setFromVal(result);
  };

  const addToHistory = () => {
    if (!result) return;
    const entry = `${fromVal} ${fromUnit} = ${result} ${toUnit}`;
    setHistory(h => [entry, ...h.slice(0, 19)]);
  };

  const selStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: '#0f172a',
    border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0',
    fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020810', fontFamily: "'Segoe UI', sans-serif", color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '12px 18px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#60a5fa' }}>📐 Конвертер единиц</div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#0f1929', borderBottom: '1px solid #1e3a5f', flexShrink: 0, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => handleCat(c.id)} style={{ padding: '10px 14px', background: cat === c.id ? 'rgba(96,165,250,0.15)' : 'none', border: 'none', borderBottom: cat === c.id ? '2px solid #60a5fa' : '2px solid transparent', color: cat === c.id ? '#60a5fa' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: cat === c.id ? 700 : 400, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span>{c.icon}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Converter */}
        <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
          {/* From */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ИЗ</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" value={fromVal} onChange={e => { setFromVal(e.target.value); }}
                style={{ flex: 1, padding: '12px 14px', background: '#0a1628', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                placeholder="0"
              />
              <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} style={{ ...selStyle, flex: 2 }}>
                {Object.entries(units).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Swap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: '#1e3a5f' }} />
            <button onClick={swap} style={{ padding: '8px 14px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, color: '#60a5fa', fontSize: 18, cursor: 'pointer' }}>⇄</button>
            <div style={{ flex: 1, height: 1, background: '#1e3a5f' }} />
          </div>

          {/* To */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>В</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '12px 14px', background: '#0a1628', border: '1px solid #334155', borderRadius: 10, fontSize: 20, fontWeight: 700, color: result ? '#22c55e' : '#334155', fontFamily: 'inherit', minWidth: 0 }}>
                {result || '—'}
              </div>
              <select value={toUnit} onChange={e => setToUnit(e.target.value)} style={{ ...selStyle, flex: 2 }}>
                {Object.entries(units).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addToHistory} disabled={!result} style={{ flex: 1, padding: '10px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + В историю
            </button>
            <button onClick={() => { navigator.clipboard.writeText(result || ''); }} disabled={!result} style={{ flex: 1, padding: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#86efac', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              📋 Копировать
            </button>
          </div>
        </div>

        {/* All units table */}
        <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>Все единицы</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(units).map(([key, u]) => {
              const val = parseFloat(fromVal);
              const converted = isNaN(val) ? '—' : u.fromBase(units[fromUnit]?.toBase(val) ?? 0).toPrecision(6).replace(/\.?0+$/, '');
              return (
                <div key={key} onClick={() => setToUnit(key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: toUnit === key ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${toUnit === key ? '#60a5fa40' : 'transparent'}` }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{u.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: toUnit === key ? '#60a5fa' : '#fff', fontFamily: 'Consolas, monospace' }}>{converted}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: '#0f1929', border: '1px solid #1e3a5f', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>История</div>
              <button onClick={() => setHistory([])} style={{ padding: '3px 8px', background: 'none', border: '1px solid #1e3a5f', borderRadius: 5, color: '#475569', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Очистить</button>
            </div>
            {history.map((h, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: i < history.length - 1 ? '1px solid #1e3a5f' : 'none', fontSize: 12, color: '#94a3b8', fontFamily: 'Consolas, monospace' }}>{h}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
