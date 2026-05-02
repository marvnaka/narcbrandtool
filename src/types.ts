export interface Point {
  x: number;
  y: number;
}

export type AppStatus = 'READY' | 'DETECTING...' | 'PROCESSED';

export interface OverlayDef {
  id: string;
  label: string;
  blendMode: GlobalCompositeOperation;
  path: string;
}

export interface AppState {
  imageFile: File | null;
  imageDataUrl: string | null;
  status: AppStatus;
  rawHullPoints: Point[] | null;
  polygonPoints: Point[] | null;
  vertexCount: number;
  polygonComplexity: number;
  prismScale: number;
  activeOverlays: string[];
}
