import type { OverlayDef } from './types';

// Overlay PNGs are served from /public/overlays/ by Vite's static file server.
// Blend modes: white-background PNGs use 'multiply' (white disappears),
// black-background PNG uses 'screen' (black disappears).
export const OVERLAYS: OverlayDef[] = [
  { id: 'logo',    label: 'NASR Logo',     blendMode: 'multiply', path: '/overlays/overlay-logo.png' },
  { id: 'details', label: 'Event Details', blendMode: 'multiply', path: '/overlays/overlay-details.png' },
  { id: 'texture', label: 'Light Wash',    blendMode: 'multiply', path: '/overlays/overlay-texture.png' },
  { id: 'marquee', label: 'Text Marquee',  blendMode: 'screen',   path: '/overlays/overlay-marquee.png' },
];
