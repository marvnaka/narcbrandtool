export async function generateNoiseCanvasAsync(width: number, height: number): Promise<HTMLCanvasElement> {
  const svgWidth = Math.max(1, Math.ceil(width * 0.3));
  const svgHeight = height;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
    <filter id="noise" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.24 0.24" numOctaves="4" seed="42" result="turbulence"/>
      <feColorMatrix type="saturate" values="0" in="turbulence" result="grey"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)"/>
  </svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Step B: draw narrow SVG stretched to full width (vertical grain)
      const stretched = document.createElement('canvas');
      stretched.width = width;
      stretched.height = height;
      stretched.getContext('2d')!.drawImage(img, 0, 0, width, height);

      // Step C: blur 27px
      const blurred = document.createElement('canvas');
      blurred.width = width;
      blurred.height = height;
      const bCtx = blurred.getContext('2d')!;
      bCtx.filter = 'blur(27px)';
      bCtx.drawImage(stretched, 0, 0);
      bCtx.filter = 'none';

      resolve(blurred);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load noise SVG'));
    };
    img.src = url;
  });
}
