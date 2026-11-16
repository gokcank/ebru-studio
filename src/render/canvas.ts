// Tekneyi çizer: su zemini, damlalar (dolgu + pigment kenarı), kitre dokusu, vinyet.
// Tekne ekrandan bağımsız bir boyuttadır; burada ekrana sığdırılır (oran korunur,
// ortalanır). Yalnız engine tiplerini bilir; durum tutmaz, hamle uygulamaz.

import type { Drop, Vec2 } from '../engine/types';

// Doku dili katsayıları (görünüm; his katsayıları engine/params.ts'tedir).
const LOOK = {
  /** Cihaz piksel oranı tavanı (bellek ve hız için). */
  maxDpr: 2,
  /** Pigment kenar hattı kalınlığı (tekne birimi). */
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
  /** Tekne ekranı doldurmuyorsa çevresine çizilen çerçevenin kalınlığı (px). */
  frameWidth: 1,
} as const;

/** Teknenin boyutu (engine koordinat birimiyle). */
export type Basin = { readonly w: number; readonly h: number };

/** Çizimde kullanılan tema renkleri (theme.css tokenları). */
export type Theme = {
  /** Teknedeki su. */
  water: string;
  /** Teknenin dışında kalan tezgâh. */
  bench: string;
  /** Tekne çerçevesi. */
  line: string;
};

export type Renderer = {
  /** Tuvalin CSS piksel boyutu. */
  readonly width: number;
  readonly height: number;
  /** Tuvali kutusuna ve ekran yoğunluğuna uydurur; boyut değişince çağrılır. */
  fit(): void;
  /** Tuval konumunu (CSS piksel) tekne koordinatına çevirir. */
  toBasin(x: number, y: number, basin: Basin): Vec2;
  /** Tekneyi baştan çizer. */
  draw(drops: readonly Drop[], basin: Basin, theme: Theme): void;
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
  const c = ctx;

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
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineJoin = c.lineCap = 'round';
  }

  /** Tekneyi tuvale sığdıran dönüşüm: ölçek ve sol üst köşenin konumu. */
  function view(basin: Basin): { s: number; ox: number; oy: number } {
    if (basin.w <= 0 || basin.h <= 0) return { s: 1, ox: 0, oy: 0 };
    const s = Math.min(width / basin.w, height / basin.h);
    return { s, ox: (width - basin.w * s) / 2, oy: (height - basin.h * s) / 2 };
  }

  function toBasin(x: number, y: number, basin: Basin): Vec2 {
    const { s, ox, oy } = view(basin);
    return [(x - ox) / s, (y - oy) / s];
  }

  function draw(drops: readonly Drop[], basin: Basin, theme: Theme): void {
    const { w, h } = basin;
    const { s, ox, oy } = view(basin);
    // Tekne ekranı doldurmuyorsa çevresinde tezgâh görünür.
    const framed = ox > 0.5 || oy > 0.5;
    if (framed || w <= 0 || h <= 0) {
      c.fillStyle = theme.bench;
      c.fillRect(0, 0, width, height);
    }
    if (w <= 0 || h <= 0) return;

    c.save();
    c.translate(ox, oy);
    c.scale(s, s);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();

    c.fillStyle = theme.water;
    c.fillRect(0, 0, w, h);

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
      c.fillRect(0, 0, w, h);
      c.restore();
    }

    // Vinyet: tekneye derinlik veren kenar gölgesi.
    const vignette = c.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * LOOK.vignetteInner,
      w / 2,
      h / 2,
      Math.hypot(w, h) * LOOK.vignetteOuter,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${LOOK.vignetteAlpha})`);
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
    c.restore();

    if (framed) {
      const f = LOOK.frameWidth;
      c.strokeStyle = theme.line;
      c.lineWidth = f;
      c.strokeRect(ox + f / 2, oy + f / 2, w * s - f, h * s - f);
    }
  }

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    fit,
    toBasin,
    draw,
  };
}
