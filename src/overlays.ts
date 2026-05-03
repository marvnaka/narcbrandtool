import type { OverlayDef } from './types';

// Overlay PNGs are served from /public/overlays/ by Vite's static file server.
// Blend modes: white-background PNGs use 'multiply' (white disappears),
// black-background PNG uses 'screen' (black disappears).
export const OVERLAYS: OverlayDef[] = [
  { id: 'logo',    label: 'NASR Logo',     blendMode: 'source-over', path: '/overlays/overlay-logo.png',    category: 'overlay' },
  { id: 'marquee', label: 'Text Marquee',  blendMode: 'source-over', path: '/overlays/overlay-marquee.png', category: 'overlay' },
  { id: 'details', label: 'Event Details', blendMode: 'source-over', path: '/overlays/overlay-details.png', category: 'patch' },
  { id: 'texture', label: 'Light Wash',    blendMode: 'source-over', path: '/overlays/overlay-texture.png', category: 'patch' },
];
