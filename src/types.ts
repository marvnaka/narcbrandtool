export interface Point {
  x: number;
  y: number;
}

export type AppStatus = 'READY' | 'DETECTING...' | 'PROCESSED';

export interface AppState {
  imageFile: File | null;
  imageDataUrl: string | null;
  status: AppStatus;
  rawHullPoints: Point[] | null; // normalized 0–1, from MediaPipe + convex hull
  polygonPoints: Point[] | null; // simplified via RDP, normalized 0–1
  vertexCount: number;
  polygonComplexity: number; // slider 4–12, default 8
}
