import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = [
  '#000000','#ffffff','#808080','#c0c0c0','#800000','#ff0000','#808000','#ffff00',
  '#008000','#00ff00','#008080','#00ffff','#000080','#0000ff','#800080','#ff00ff',
  '#ff8040','#ff6600','#40ff00','#00ff80','#0080ff','#8000ff','#ff0080','#ff80c0',
];

type Tool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rect' | 'circle' | 'fill';

export default function Paint({ initialImageUrl }: { initialImageUrl?: string } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);
  const [selectColor, setSelectColor] = useState<'fg' | 'bg'>('fg');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (initialImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialImageUrl;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [initialImageUrl]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const fill = useCallback((x: number, y: number, fillColor: string) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
    const targetR = data[idx], targetG = data[idx+1], targetB = data[idx+2];
    const [fr, fg, fb] = fillColor.match(/\w\w/g)!.map(h => parseInt(h, 16));
    if (targetR === fr && targetG === fg && targetB === fb) return;

    const stack = [[Math.floor(x), Math.floor(y)]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const i = (cy * canvas.width + cx) * 4;
      if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
      if (data[i] !== targetR || data[i+1] !== targetG || data[i+2] !== targetB) continue;
      data[i] = fr; data[i+1] = fg; data[i+2] = fb; data[i+3] = 255;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    if (tool === 'fill') { fill(pos.x, pos.y, color); return; }
    setDrawing(true);
    setStartPos(pos);
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'brush' ? lineWidth * 3 : tool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (tool === 'line') {
        ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(
          (startPos.x + pos.x) / 2, (startPos.y + pos.y) / 2,
          Math.abs(pos.x - startPos.x) / 2, Math.abs(pos.y - startPos.y) / 2,
          0, 0, 2 * Math.PI
        );
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const tools: { id: Tool; icon: string; label: string }[] = [
    { id: 'pencil', icon: '✏️', label: 'Карандаш' },
    { id: 'brush', icon: '🖌️', label: 'Кисть' },
    { id: 'eraser', icon: '🧹', label: 'Ластик' },
    { id: 'fill', icon: '🪣', label: 'Заливка' },
    { id: 'line', icon: '╱', label: 'Линия' },
    { id: 'rect', icon: '▭', label: 'Прямоугольник' },
    { id: 'circle', icon: '○', label: 'Эллипс' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0f0', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Toolbar */}
      <div style={{ background: 'linear-gradient(#f8f8f8, #e0e0e0)', borderBottom: '1px solid #bbb', padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: 3, background: '#e8e8e8', border: '1px solid #ccc', borderRadius: 3, padding: 3 }}>
          {tools.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
              style={{ background: tool === t.id ? '#3399cc' : 'none', color: tool === t.id ? '#fff' : '#000', border: 'none', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 14, minWidth: 32 }}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Line width */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span>Размер:</span>
          <input type="range" min={1} max={20} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} style={{ width: 70 }} />
          <span>{lineWidth}px</span>
        </div>

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 220 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)}
              style={{ width: 16, height: 16, background: c, border: color === c ? '2px solid #333' : '1px solid #888', cursor: 'pointer', borderRadius: 2 }} />
          ))}
        </div>

        {/* Current colors */}
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, background: bgColor, border: '2px solid #999' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, background: color, border: '2px solid #333' }} />
        </div>

        <button onClick={clearCanvas}
          style={{ background: 'linear-gradient(#fff, #ddd)', border: '1px solid #bbb', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
          🗑️ Очистить
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: 'auto', background: '#808080', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 12 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ cursor: tool === 'fill' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'crosshair', display: 'block', background: '#fff', boxShadow: '2px 2px 8px rgba(0,0,0,0.4)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Status */}
      <div style={{ borderTop: '1px solid #ccc', padding: '2px 12px', fontSize: 11, color: '#666', background: '#f0f0f0' }}>
        Инструмент: {tools.find(t => t.id === tool)?.label} | Цвет: {color} | Размер холста: 800 × 600
      </div>
    </div>
  );
}
