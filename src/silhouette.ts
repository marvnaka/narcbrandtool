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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Inspect a rasterized mask canvas and detect which channel holds confidence
// Returns: 'R' | 'A' | 'max'
function detectMaskChannel(data: Uint8ClampedArray): 'R' | 'A' | 'max' {
  let totalR = 0, totalA = 0, samples = 0;
  // sample 200 evenly spaced pixels
  const step = Math.floor(data.length / 4 / 200);
  for (let i = 0; i < data.length; i += step * 4) {
    totalR += data[i];
    totalA += data[i + 3];
    samples++;
  }
  const avgR = totalR / samples;
  const avgA = totalA / samples;
  // If alpha is mostly 255 (fully opaque), the signal is in the colour channels
  // If alpha varies significantly, confidence is encoded in alpha
  console.log('[Prismatic] mask channel probe — avg R:', avgR.toFixed(1), 'avg A:', avgA.toFixed(1));
  if (avgA > 200 && avgR < 200) return 'R'; // opaque canvas, signal in R
  if (avgA < 200 && avgA > 5) return 'A';  // alpha carries confidence
  return 'max';                              // unknown — use max of all channels
}

export async function detectSilhouette(imageDataUrl: string): Promise<Point[]> {
  await loadMediaPipeScript();

  const img = await loadImage(imageDataUrl);
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  console.log('[Prismatic] image dimensions:', imgW, '×', imgH);

  // Draw image to canvas — MediaPipe requires an HTMLCanvasElement or HTMLImageElement
  const inputCanvas = document.createElement('canvas');
  inputCanvas.width = imgW;
  inputCanvas.height = imgH;
  inputCanvas.getContext('2d')!.drawImage(img, 0, 0);

  // ── 3. MediaPipe setup ───────────────────────────────────────────────────
  // modelSelection 1 = full body model (not landscape/selfie mode 0)
  // selfieMode false = don't mirror the image
  const segmentation = new window.SelfieSegmentation({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });

  segmentation.setOptions({ modelSelection: 1, selfieMode: false });

  // onResults MUST be registered before .send()
  const maskImageBitmap = await new Promise<ImageBitmap>((resolve, reject) => {
    segmentation.onResults((results: SelfieSegmentationResults) => {
      if (!results.segmentationMask) {
        reject(new Error('MediaPipe returned null segmentation mask'));
        return;
      }
      resolve(results.segmentationMask);
    });
    segmentation.send({ image: inputCanvas }).catch(reject);
  });

  segmentation.close();

  // ── 1. Log mask dimensions vs image dimensions ───────────────────────────
  const maskNativeW = maskImageBitmap.width;
  const maskNativeH = maskImageBitmap.height;
  console.log('[Prismatic] segmentationMask native size:', maskNativeW, '×', maskNativeH);
  console.log('[Prismatic] image size:', imgW, '×', imgH);

  const dimensionsMatch = maskNativeW === imgW && maskNativeH === imgH;
  console.log('[Prismatic] mask dimensions match image:', dimensionsMatch);

  // Rasterise mask at IMAGE dimensions — if the native mask is at model
  // resolution (e.g. 256×256) drawImage will scale it up to image space,
  // so all extracted pixel coordinates are already in image space.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = imgW;
  maskCanvas.height = imgH;
  const maskCtx = maskCanvas.getContext('2d')!;
  maskCtx.drawImage(maskImageBitmap, 0, 0, imgW, imgH);

  const imageData = maskCtx.getImageData(0, 0, imgW, imgH);
  const { data } = imageData;

  // ── Detect which channel carries confidence ──────────────────────────────
  const channel = detectMaskChannel(data);
  console.log('[Prismatic] using mask channel:', channel);

  // Log a 3×3 grid of sample pixels so we can see actual values
  console.log('[Prismatic] sample pixels (x, y, R, G, B, A):');
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const px = Math.floor((col + 0.5) * imgW / 3);
      const py = Math.floor((row + 0.5) * imgH / 3);
      const i = (py * imgW + px) * 4;
      console.log(`  [${px}, ${py}] R=${data[i]} G=${data[i+1]} B=${data[i+2]} A=${data[i+3]}`);
    }
  }

  // ── 2. Extract foreground pixels ─────────────────────────────────────────
  // threshold > 0.5  →  > 128 out of 255
  const THRESHOLD = 128;
  const foregroundPoints: Point[] = [];
  const stride = 4;

  for (let y = 0; y < imgH; y += stride) {
    for (let x = 0; x < imgW; x += stride) {
      const idx = (y * imgW + x) * 4;
      let val: number;
      if (channel === 'R') {
        val = data[idx];
      } else if (channel === 'A') {
        val = data[idx + 3];
      } else {
        val = Math.max(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]);
      }
      if (val > THRESHOLD) {
        foregroundPoints.push({ x, y });
      }
    }
  }

  console.log('[Prismatic] foreground pixels found (stride', stride + '):', foregroundPoints.length);

  if (foregroundPoints.length < 3) {
    // Fallback: try every channel explicitly to help diagnose
    const tryCounts = [0, 0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]     > THRESHOLD) tryCounts[0]++;
      if (data[i + 1] > THRESHOLD) tryCounts[1]++;
      if (data[i + 2] > THRESHOLD) tryCounts[2]++;
      if (data[i + 3] > THRESHOLD) tryCounts[3]++;
    }
    console.error('[Prismatic] channel counts above threshold — R:', tryCounts[0],
      'G:', tryCounts[1], 'B:', tryCounts[2], 'A:', tryCounts[3]);
    throw new Error('No foreground detected. Try a photo with a clear subject against a distinct background.');
  }

  // ── Convex hull ─────────────────────────────────────────────────────────
  const hull = convexHull(foregroundPoints);

  // ── 4. Log final hull before RDP ─────────────────────────────────────────
  console.log('[Prismatic] convex hull', hull.length, 'points (pixel coords):');
  hull.forEach((p, i) => console.log(`  [${i}] x=${p.x} y=${p.y}`));

  const xVals = hull.map(p => p.x);
  const yVals = hull.map(p => p.y);
  console.log('[Prismatic] hull bounding box — x:', Math.min(...xVals), '→', Math.max(...xVals),
    '  y:', Math.min(...yVals), '→', Math.max(...yVals));
  console.log('[Prismatic] expected span — x: 0 →', imgW, '  y: 0 →', imgH);

  // Normalise to 0–1 using image dimensions (coords are already in image space)
  const normalized = hull.map(p => ({
    x: p.x / imgW,
    y: p.y / imgH,
  }));

  return normalized;
}
