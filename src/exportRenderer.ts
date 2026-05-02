import type { Point } from './types';
import { scaleFromCentroid } from './geometry';
import { generateNoiseCanvasAsync } from './filters';

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportToPng(
  imageDataUrl: string,
  polygonPoints: Point[] | null,
  prismScale: number
): Promise<void> {
  const offscreen = document.createElement('canvas');
  offscreen.width = EXPORT_WIDTH;
  offscreen.height = EXPORT_HEIGHT;
  const ctx = offscreen.getContext('2d')!;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  // Layer 0: Photo with cover crop
  const img = await loadImageElement(imageDataUrl);
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = EXPORT_WIDTH / EXPORT_HEIGHT;

  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  if (polygonPoints && polygonPoints.length >= 3) {
    const scaledPoints = scaleFromCentroid(polygonPoints, prismScale);
    const pixelPoints = scaledPoints.map(p => ({
      x: p.x * EXPORT_WIDTH,
      y: p.y * EXPORT_HEIGHT,
    }));

    ctx.save();

    // Polygon fill with difference blend
    ctx.beginPath();
    ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
    for (let i = 1; i < pixelPoints.length; i++) {
      ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
    }
    ctx.closePath();

    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#EEFF00';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Noise texture clipped to polygon
    ctx.beginPath();
    ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
    for (let i = 1; i < pixelPoints.length; i++) {
      ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
    }
    ctx.closePath();
    ctx.clip();

    try {
      const noiseCanvas = await generateNoiseCanvasAsync(EXPORT_WIDTH, EXPORT_HEIGHT);
      ctx.globalAlpha = 0.25;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.drawImage(noiseCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } catch {
      // continue without noise
    }

    ctx.restore();
  }

  // Trigger download
  const dataUrl = offscreen.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'prismatic-poster.png';
  link.href = dataUrl;
  link.click();
}
