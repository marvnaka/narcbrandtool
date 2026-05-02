export interface Point {
  x: number;
  y: number;
}

export type AppStatus = 'READY' | 'DETECTING...' | 'PROCESSED';

export interface OverlayDef {
  id: string;
  label: string;
  blendMode: GlobalCompositeOperation;
  generate: (w: number, h: number) => HTMLCanvasElement;
}

export interface AppState {
  imageFile: File | null;
  imageDataUrl: string | null;
  status: AppStatus;
  rawHullPoints: Point[] | null;
  polygonPoints: Point[] | null;
  vertexCount: number;
  polygonComplexity: number; // slider 6–13, default 8
  prismScale: number;        // slider 2.0–6.0, default 1.5
  activeOverlays: string[];  // ids of currently enabled overlays, in order
}
