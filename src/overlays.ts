import type { OverlayDef } from './types';
import {
  generateLogoCanvas,
  generateDetailsCanvas,
  generateTextureCanvas,
  generateMarqueeCanvas,
} from './overlayGenerators';

export const OVERLAYS: OverlayDef[] = [
  { id: 'logo',    label: 'NASR Logo',     blendMode: 'multiply', generate: generateLogoCanvas },
  { id: 'details', label: 'Event Details', blendMode: 'multiply', generate: generateDetailsCanvas },
  { id: 'texture', label: 'Light Wash',    blendMode: 'multiply', generate: generateTextureCanvas },
  { id: 'marquee', label: 'Text Marquee',  blendMode: 'screen',   generate: generateMarqueeCanvas },
];
