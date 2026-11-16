// Tekneyi çizer: su zemini, damlalar (dolgu + pigment kenarı), kitre dokusu, vinyet.
// Yalnız engine tiplerini bilir; durum tutmaz, hamle uygulamaz.

import type { Drop } from '../engine/types';

// Doku dili katsayıları (görünüm; his katsayıları engine/params.ts'tedir).
const LOOK = {
  /** Cihaz piksel oranı tavanı (bellek ve hız için). */
  maxDpr: 2,
  /** Pigment kenar hattı kalınlığı (px). */
  edgeWidth: 0.8,
  /** Kitre dokusu karosunun kenarı (px). */
  grainSize: 160,
  /** Kitre dokusunun gri aralığı [min, min + span). */
  grainMin: 205,
  grainSpan: 50,
  /** Kitre dokusunun çarpma (multiply) saydamlığı. */
  grainAlpha: 0.06,
  /** Vinyet: iç yarıçap (kısa kenar oranı), dış yarıçap (köşegen oranı), koyuluk. */
  vignetteInner: 0.45,
  vignetteOuter: 0.58,
  vignetteAlpha: 0.12,
} as const;

export type Renderer = {
  /** Tuvalin CSS piksel boyutu (engine koordinatları bu birimdedir). */
  readonly width: number;
  readonly height: number;
  /** Tuvali kutusuna ve ekran yoğunluğuna uydurur; boyut değişince çağrılır. */
  fit(): void;
  /** Tekneyi baştan çizer. `water` su rengidir (tema tokenı). */
  draw(drops: readonly Drop[], water: string): void;
};

/** Kitre dokusu: bir kez üretilen gri gürültü karosu. */
function createGrain(): HTMLCanvasElement {
  const size = LOOK.grainSize;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const g = tile.getContext('2d');
  if (!g) return tile;
  const image = g.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = (LOOK.grainMin + Math.random() * LOOK.grainSpan) | 0;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return tile;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D desteklenmiyor');

  const grain = createGrain();
  let grainPattern: CanvasPattern | null = null;
  let width = 0;
  let height = 0;

  function fit(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, LOOK.maxDpr);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Boyut atanınca bağlam sıfırlanır: ölçek ve çizgi ayarları yeniden kurulur.
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.lineJoin = ctx!.lineCap = 'round';
  }

  function draw(drops: readonly Drop[], water: string): void {
    const c = ctx!;
    c.fillStyle = water;
    c.fillRect(0, 0, width, height);

    c.lineWidth = LOOK.edgeWidth;
    for (const d of drops) {
      const p = d.p;
      if (p.length < 6) continue;
      c.beginPath();
      c.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
      c.closePath();
      c.fillStyle = d.c;
      c.fill();
      c.strokeStyle = d.e;
      c.stroke();
    }

    grainPattern ??= c.createPattern(grain, 'repeat');
    if (grainPattern) {
      c.save();
      c.globalAlpha = LOOK.grainAlpha;
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = grainPattern;
      c.fillRect(0, 0, width, height);
      c.restore();
    }

    // Vinyet: tekneye derinlik veren kenar gölgesi.
    const vignette = c.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * LOOK.vignetteInner,
      width / 2,
      height / 2,
      Math.hypot(width, height) * LOOK.vignetteOuter,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${LOOK.vignetteAlpha})`);
    c.fillStyle = vignette;
    c.fillRect(0, 0, width, height);
  }

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    fit,
    draw,
  };
}
