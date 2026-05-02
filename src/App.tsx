import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { renderComposition } from './CanvasRenderer';
import { detectSilhouette } from './silhouette';
import { simplifyPolygon } from './geometry';
import { exportToPng } from './exportRenderer';
import type { AppState, Point } from './types';

const CANVAS_W = 1080;
const CANVAS_H = 1350;

function complexityToEpsilon(complexity: number): number {
  // Hull coordinates are normalized 0–1, so epsilon must be in the same space.
  // Equivalent to the spec's 80px / 15px range on a ~1080px image:
  //   complexity 4  → epsilon 0.08  (fewest vertices, most simplified)
  //   complexity 12 → epsilon 0.015 (most vertices, least simplified)
  const t = (complexity - 4) / (12 - 4);
  return 0.08 - t * (0.08 - 0.015);
}

const initialState: AppState = {
  imageFile: null,
  imageDataUrl: null,
  status: 'READY',
  rawHullPoints: null,
  polygonPoints: null,
  vertexCount: 0,
  polygonComplexity: 8,
};

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const renderQueued = useRef(false);

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;
      const { width, height } = container.getBoundingClientRect();
      const padding = 48;
      const scaleByW = (width - padding) / CANVAS_W;
      const scaleByH = (height - padding) / CANVAS_H;
      setCanvasScale(Math.min(scaleByW, scaleByH, 1));
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (renderQueued.current) return;
    renderQueued.current = true;
    renderComposition(ctx, {
      imageDataUrl: state.imageDataUrl,
      polygonPoints: state.polygonPoints,
      canvasWidth: CANVAS_W,
      canvasHeight: CANVAS_H,
    }).finally(() => {
      renderQueued.current = false;
    });
  }, [state.imageDataUrl, state.polygonPoints]);

  const applyComplexity = useCallback((rawHull: Point[], complexity: number, jitter = 0) => {
    const epsilon = complexityToEpsilon(complexity) + jitter;
    let simplified = simplifyPolygon(rawHull, epsilon);
    if (simplified.length < 4) simplified = rawHull.slice(0, 4);
    if (simplified.length > 14) simplified = simplified.slice(0, 14);
    return simplified;
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setState(prev => ({
        ...prev,
        imageFile: file,
        imageDataUrl: dataUrl,
        rawHullPoints: null,
        polygonPoints: null,
        vertexCount: 0,
        status: 'READY',
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDetectSilhouette = useCallback(async () => {
    if (!state.imageDataUrl) return;
    setState(prev => ({ ...prev, status: 'DETECTING...' }));
    try {
      const hullPoints = await detectSilhouette(state.imageDataUrl);
      const simplified = applyComplexity(hullPoints, state.polygonComplexity, 0);
      setState(prev => ({
        ...prev,
        status: 'PROCESSED',
        rawHullPoints: hullPoints,
        polygonPoints: simplified,
        vertexCount: simplified.length,
      }));
    } catch (err) {
      console.error('Silhouette detection failed:', err);
      setState(prev => ({ ...prev, status: 'READY' }));
      alert('Silhouette detection failed. ' + (err instanceof Error ? err.message : 'Unknown error.'));
    }
  }, [state.imageDataUrl, state.polygonComplexity, applyComplexity]);

  const handleComplexityChange = useCallback((value: number) => {
    setState(prev => {
      if (!prev.rawHullPoints) return { ...prev, polygonComplexity: value };
      const simplified = applyComplexity(prev.rawHullPoints, value, 0);
      return {
        ...prev,
        polygonComplexity: value,
        polygonPoints: simplified,
        vertexCount: simplified.length,
      };
    });
  }, [applyComplexity]);

  const handleRegeneratePolygon = useCallback(() => {
    setState(prev => {
      if (!prev.rawHullPoints) return prev;
      const jitter = (Math.random() - 0.5) * 16;
      const simplified = applyComplexity(prev.rawHullPoints, prev.polygonComplexity, jitter);
      return { ...prev, polygonPoints: simplified, vertexCount: simplified.length };
    });
  }, [applyComplexity]);

  const handleExport = useCallback(async () => {
    if (!state.imageDataUrl) return;
    try {
      await exportToPng(state.imageDataUrl, state.polygonPoints);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error.'));
    }
  }, [state.imageDataUrl, state.polygonPoints]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  const displayW = CANVAS_W * canvasScale;
  const displayH = CANVAS_H * canvasScale;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0D0D0D' }}>
      <Sidebar
        state={state}
        onImageUpload={handleImageUpload}
        onDetectSilhouette={handleDetectSilhouette}
        onComplexityChange={handleComplexityChange}
        onRegeneratePolygon={handleRegeneratePolygon}
        onExport={handleExport}
      />

      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: '#1A1A1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!state.imageDataUrl && (
          <div style={{
            position: 'absolute',
            border: '0.5px dashed #333333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: displayW,
            height: displayH,
            pointerEvents: 'none',
          }}>
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '9px',
              color: '#555555',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 2,
            }}>
              Drop image here<br />or use Upload in sidebar
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: displayW, height: displayH, display: 'block' }}
        />
      </div>
    </div>
  );
}
