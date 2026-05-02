import type { Point } from './types';
import { convexHull } from './geometry';

declare global {
  interface Window {
    SelfieSegmentation: new (config: { locateFile: (file: string) => string }) => SelfieSegmentationInstance;
  }
}

interface SelfieSegmentationResults {
  segmentationMask: ImageBitmap;
}

interface SelfieSegmentationInstance {
  setOptions: (opts: { modelSelection: number; selfieMode?: boolean }) => void;
  onResults: (cb: (results: SelfieSegmentationResults) => void) => void;
  send: (input: { image: HTMLCanvasElement | HTMLImageElement | ImageBitmap }) => Promise<void>;
  close: () => void;
}

let mediaPipeLoaded = false;

function loadMediaPipeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mediaPipeLoaded) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => { mediaPipeLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function detectSilhouette(
  imageDataUrl: string,
  onProgress?: (msg: string) => void
): Promise<Point[]> {
  onProgress?.('Loading MediaPipe...');
  await loadMediaPipeScript();

  const img = await loadImage(imageDataUrl);

  onProgress?.('Running segmentation...');

  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth || img.width;
  offscreen.height = img.naturalHeight || img.height;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const segmentation = new window.SelfieSegmentation({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });

  segmentation.setOptions({ modelSelection: 1 });

  const maskCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
    segmentation.onResults((results: SelfieSegmentationResults) => {
      const mc = document.createElement('canvas');
      mc.width = offscreen.width;
      mc.height = offscreen.height;
      const mCtx = mc.getContext('2d')!;
      mCtx.drawImage(results.segmentationMask, 0, 0, mc.width, mc.height);
      resolve(mc);
    });

    segmentation.send({ image: offscreen }).catch(reject);
  });

  segmentation.close();

  onProgress?.('Extracting foreground pixels...');

  const maskCtx = maskCanvas.getContext('2d')!;
  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const { data, width, height } = imageData;

  const foregroundPoints: Point[] = [];
  const stride = 4; // sample every 4th pixel for performance
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = (y * width + x) * 4;
      // MediaPipe mask: white (255) = foreground, black (0) = background
      if (data[idx] > 128) {
        foregroundPoints.push({ x, y });
      }
    }
  }

  if (foregroundPoints.length < 3) {
    throw new Error('No foreground detected. Try a photo with a clear subject.');
  }

  onProgress?.('Computing convex hull...');

  const hull = convexHull(foregroundPoints);

  // Normalize to 0–1
  const normalized = hull.map(p => ({
    x: p.x / width,
    y: p.y / height,
  }));

  return normalized;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
