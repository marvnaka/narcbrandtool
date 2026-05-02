import type { Point, OverlayDef } from './types';
import { nonLinearScaleFromCentroid } from './geometry';
import { generateNoiseCanvasAsync } from './filters';

export interface RenderParams {
  imageDataUrl: string | null;
  polygonPoints: Point[] | null;
  prismScale: number;
  activeOverlays: OverlayDef[];
  canvasWidth: number;
  canvasHeight: number;
}

let cachedNoiseCanvas: HTMLCanvasElement | null = null;
let cachedNoiseKey = '';

async function getNoiseCanvas(width: number, height: number): Promise<HTMLCanvasElement> {
  const key = `${width}x${height}`;
  if (cachedNoiseCanvas && cachedNoiseKey === key) return cachedNoiseCanvas;
  cachedNoiseCanvas = await generateNoiseCanvasAsync(width, height);
  cachedNoiseKey = key;
  return cachedNoiseCanvas;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImageElement(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderComposition(
  ctx: CanvasRenderingContext2D,
  params: RenderParams
): Promise<void> {
  const { imageDataUrl, polygonPoints, prismScale, activeOverlays, canvasWidth, canvasHeight } = params;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!imageDataUrl) return;

  // Layer 0: Photo (object-fit: cover)
  const img = await loadImageElement(imageDataUrl);
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);

  // Layer 0.5: Overlays — above photo, below prism
  for (const overlay of activeOverlays) {
    try {
      const overlayImg = await loadImageElement(overlay.path);
      ctx.save();
      ctx.globalCompositeOperation = overlay.blendMode;
      ctx.drawImage(overlayImg, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    } catch {
      // file missing, skip silently
    }
  }

  if (!polygonPoints || polygonPoints.length < 3) return;

  // Layer 1: Prismatic silhouette polygon
  const scaledPoints = nonLinearScaleFromCentroid(polygonPoints, prismScale);
  const pixelPoints = scaledPoints.map(p => ({
    x: p.x * canvasWidth,
    y: p.y * canvasHeight,
  }));

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
  for (let i = 1; i < pixelPoints.length; i++) ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
  ctx.closePath();

  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#EEFF00';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.beginPath();
  ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
  for (let i = 1; i < pixelPoints.length; i++) ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
  ctx.closePath();
  ctx.clip();

  try {
    const noiseCanvas = await getNoiseCanvas(canvasWidth, canvasHeight);
    ctx.globalAlpha = 0.25;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(noiseCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } catch {
    // render without noise
  }

  ctx.restore();
}
