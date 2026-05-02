export interface Point {
  x: number;
  y: number;
}

export type AppStatus = 'READY' | 'DETECTING...' | 'PROCESSED';

export interface OverlayDef {
  id: string;
  label: string;
  path: string;
  blendMode: GlobalCompositeOperation;
}

export const OVERLAYS: OverlayDef[] = [
  { id: 'logo',    label: 'NASR Logo',      path: '/overlays/overlay-logo.png',    blendMode: 'multiply' },
  { id: 'details', label: 'Event Details',  path: '/overlays/overlay-details.png', blendMode: 'multiply' },
  { id: 'texture', label: 'Overlay 03',     path: '/overlays/overlay-texture.png', blendMode: 'multiply' },
  { id: 'marquee', label: 'Text Marquee',   path: '/overlays/overlay-marquee.png', blendMode: 'screen'   },
];

export interface AppState {
  imageFile: File | null;
  imageDataUrl: string | null;
  status: AppStatus;
  rawHullPoints: Point[] | null; // normalized 0–1, from MediaPipe + convex hull
  polygonPoints: Point[] | null; // simplified via RDP, normalized 0–1
  vertexCount: number;
  polygonComplexity: number; // slider 6–13, default 8
  prismScale: number;        // slider 2.0–6.0, default 1.5
  activeOverlays: string[];  // ids of currently enabled overlays, in order
}
