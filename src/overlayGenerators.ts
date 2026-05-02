// All 4 overlays generated on-canvas — no external PNG files needed.
// Canvases are cached after first generation.

const SAGE = '#B3C3AF'; // muted sage green from NASR branding

const cache = new Map<string, HTMLCanvasElement>();

function cached(key: string, fn: () => HTMLCanvasElement): HTMLCanvasElement {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key)!;
}

// Overlay 1 — NASR Logo: "NOT ANOTHER / SUNDAY RUN®" sage on white
export function generateLogoCanvas(w: number, h: number): HTMLCanvasElement {
  return cached(`logo-${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const fontSize = Math.round(w * 0.127);
    ctx.fillStyle = SAGE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${fontSize}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;

    const lineH = fontSize * 1.08;
    const blockH = lineH * 2;
    const y0 = (h - blockH) / 2 + fontSize;

    ctx.fillText('NOT ANOTHER', w / 2, y0);
    ctx.fillText('SUNDAY RUN®', w / 2, y0 + lineH);

    return c;
  });
}

// Overlay 2 — Event details: 5 repeated stacked blocks, centered, sage on white
export function generateDetailsCanvas(w: number, h: number): HTMLCanvasElement {
  return cached(`details-${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const lines = [
      '25.06.25',
      'SECOND EDITION',
      'DISTANCE: 10KM',
      'BAG DROP AVAILABLE',
      "PACE GROUPS 6'00",
    ];

    const fontSize = Math.round(w * 0.026);
    const lineH = fontSize * 1.65;
    const blockH = lines.length * lineH;
    const numBlocks = 5;
    const gap = (h - numBlocks * blockH) / (numBlocks + 1);

    ctx.fillStyle = SAGE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `500 ${fontSize}px 'IBM Plex Mono', 'Courier New', monospace`;

    for (let b = 0; b < numBlocks; b++) {
      const blockY = gap + b * (blockH + gap);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], w / 2, blockY + i * lineH);
      }
    }

    return c;
  });
}

// Overlay 3 — Film grain / light wash (the mostly-white overlay)
export function generateTextureCanvas(w: number, h: number): HTMLCanvasElement {
  return cached(`texture-${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    // Light white base
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 0, w, h);

    // Subtle grain via random pixel noise
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const grain = (Math.random() - 0.5) * 18;
      d[i]     = Math.min(255, Math.max(0, d[i]     + grain));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain));
    }
    ctx.putImageData(imageData, 0, 0);

    return c;
  });
}

// Overlay 4 — Text marquee: 3 rows of large bold white text on black, blurred/glowing
export function generateMarqueeCanvas(w: number, h: number): HTMLCanvasElement {
  return cached(`marquee-${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const fontSize = Math.round(h * 0.135);
    const glowBlur = Math.round(w * 0.012);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;

    // Glow pass (blur)
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = glowBlur * 3;
    ctx.filter = `blur(${glowBlur}px)`;

    const rows = [
      { text: 'NOT ANOTHER RUN', x: -w * 0.04, y: h * 0.27 },
      { text: 'NOTHER RUNNING',  x: -w * 0.12, y: h * 0.50 },
      { text: 'ANOTHER RUNNIN', x: -w * 0.06, y: h * 0.73 },
    ];

    rows.forEach(r => ctx.fillText(r.text, r.x, r.y));

    ctx.filter = 'none';
    ctx.shadowBlur = 0;

    return c;
  });
}
