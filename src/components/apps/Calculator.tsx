import React, { useState, useCallback } from 'react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState('');

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === '0' ? digit : prev.length < 12 ? prev + digit : prev);
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return; }
    if (!display.includes('.')) setDisplay(prev => prev + '.');
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0'); setPrevValue(null); setOperator(null); setWaitingForOperand(false); setHistory('');
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
  }, []);

  const percentage = useCallback(() => {
    const val = parseFloat(display) / 100;
    setDisplay(String(val));
  }, [display]);

  const handleOperator = useCallback((op: string) => {
    const val = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, val, operator);
      setDisplay(String(parseFloat(result.toFixed(10))));
      setPrevValue(result);
      setHistory(`${result} ${op}`);
    } else {
      setPrevValue(val);
      setHistory(`${val} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, waitingForOperand]);

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const equals = useCallback(() => {
    const val = parseFloat(display);
    if (prevValue !== null && operator) {
      const result = calculate(prevValue, val, operator);
      const rounded = parseFloat(result.toFixed(10));
      setDisplay(String(rounded));
      setHistory(`${prevValue} ${operator} ${val} =`);
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, prevValue, operator]);

  const sqrt = () => {
    const val = parseFloat(display);
    setDisplay(String(parseFloat(Math.sqrt(val).toFixed(10))));
    setWaitingForOperand(true);
  };

  type BtnType = 'number' | 'operator' | 'equals' | 'function' | 'memory';

  const buttons: { label: string; type: BtnType; action: () => void }[] = [
    { label: 'MC', type: 'memory', action: () => {} },
    { label: 'MR', type: 'memory', action: () => {} },
    { label: 'MS', type: 'memory', action: () => {} },
    { label: 'M+', type: 'memory', action: () => {} },
    { label: 'M-', type: 'memory', action: () => {} },

    { label: '←', type: 'function', action: () => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0') },
    { label: 'CE', type: 'function', action: clearEntry },
    { label: 'C', type: 'function', action: clear },
    { label: '±', type: 'function', action: toggleSign },
    { label: '√', type: 'function', action: sqrt },

    { label: '7', type: 'number', action: () => inputDigit('7') },
    { label: '8', type: 'number', action: () => inputDigit('8') },
    { label: '9', type: 'number', action: () => inputDigit('9') },
    { label: '÷', type: 'operator', action: () => handleOperator('÷') },
    { label: '%', type: 'function', action: percentage },

    { label: '4', type: 'number', action: () => inputDigit('4') },
    { label: '5', type: 'number', action: () => inputDigit('5') },
    { label: '6', type: 'number', action: () => inputDigit('6') },
    { label: '×', type: 'operator', action: () => handleOperator('×') },
    { label: '1/x', type: 'function', action: () => { const v = parseFloat(display); setDisplay(String(parseFloat((1/v).toFixed(10)))); setWaitingForOperand(true); } },

    { label: '1', type: 'number', action: () => inputDigit('1') },
    { label: '2', type: 'number', action: () => inputDigit('2') },
    { label: '3', type: 'number', action: () => inputDigit('3') },
    { label: '−', type: 'operator', action: () => handleOperator('−') },
    { label: '=', type: 'equals', action: equals },

    { label: '0', type: 'number', action: () => inputDigit('0') },
    { label: '.', type: 'number', action: inputDecimal },
    { label: '', type: 'number', action: () => {} },
    { label: '+', type: 'operator', action: () => handleOperator('+') },
    { label: '', type: 'equals', action: equals },
  ];

  const btnColors: Record<BtnType, string> = {
    number: '#f0f0f0',
    operator: '#d0d8e8',
    equals: '#c8d8e8',
    function: '#e0e8f0',
    memory: '#e8e8e8',
  };

  return (
    <div style={{ background: '#2a3a4a', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Display */}
      <div style={{ background: '#1a2a3a', padding: '8px 12px', borderBottom: '1px solid #445' }}>
        <div style={{ color: '#888', fontSize: 11, height: 16, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {history || '\u00A0'}
        </div>
        <div style={{
          color: '#fff', fontSize: 28, textAlign: 'right', fontWeight: 300,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: 1,
        }}>
          {parseFloat(display).toLocaleString('ru-RU', { maximumFractionDigits: 10 })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, padding: 8, flex: 1 }}>
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            disabled={!btn.label}
            style={{
              background: btn.label ? btnColors[btn.type] : 'transparent',
              border: btn.label ? '1px solid #bbb' : 'none',
              borderRadius: 3, cursor: btn.label ? 'pointer' : 'default',
              fontSize: 14, fontWeight: btn.type === 'operator' || btn.type === 'equals' ? 600 : 400,
              color: btn.type === 'operator' ? '#1a5a9a' : btn.type === 'equals' ? '#0a4a8a' : '#000',
              transition: 'background 0.1s',
              minHeight: 36,
            }}
            onMouseEnter={e => { if (btn.label) e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
