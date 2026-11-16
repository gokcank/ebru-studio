// Ölçüm kutusu: yalnız adreste `?debug` varken kurulur. Kare hızını, tekne
// büyüklüğünü ve hesap / çizim sürelerini gösterir; "Ağır tekne" düğmesi her
// seferinde aynı yüklü tekneyi kurar ki ölçümler karşılaştırılabilsin.

import type { Op, Vec2 } from '../engine/types';

/** Kutunun yenilenme aralığı (ms). */
const REFRESH_MS = 1000;

/** Ağır tekne: serpme sayısı × damla, ardından dikey tarak geçişleri. */
const HEAVY = {
  sprinkles: 15,
  dropsEach: 16,
  combPasses: 6,
  /** Tarak yolunun örnekleme adımı (tekne birimi). */
  combStep: 12,
} as const;

export function isDebug(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

/** Her çağrıda aynı tekneyi veren hamle listesi (tohumlar sabit). */
export function heavyBasinOps(w: number, h: number, colors: readonly string[]): Op[] {
  const ops: Op[] = [{ t: 'clear', w, h }];
  for (let i = 0; i < HEAVY.sprinkles; i++) {
    ops.push({ t: 'sprinkle', seed: i + 1, n: HEAVY.dropsEach, w, h, colors: [...colors] });
  }
  for (let i = 0; i < HEAVY.combPasses; i++) {
    // Geçişler tekneye yayılır, hafif eğiktir ve gelgit gibi bir aşağı bir yukarı
    // gider; hep aynı yöne taransaydı boya tekneden dışarı süpürülürdü.
    const x0 = (w * (i + 0.5)) / HEAVY.combPasses;
    const path: Vec2[] = [];
    for (let y = 0; y <= h; y += HEAVY.combStep) path.push([x0 + (y / h) * 40, y]);
    if (i % 2 === 1) path.reverse();
    ops.push({ t: 'comb', path });
  }
  return ops;
}

export type DebugPanel = {
  /** Bir hesap adımının ya da bir çizimin süresini (ms) kaydeder. */
  add(kind: 'compute' | 'draw', ms: number): void;
};

export type DebugOptions = {
  /** Teknenin o anki büyüklüğü. */
  stats(): { drops: number; points: number };
  onHeavy(): void;
};

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function createDebugPanel(parent: HTMLElement, options: DebugOptions): DebugPanel {
  const box = document.createElement('div');
  box.id = 'debug';
  const text = document.createElement('pre');
  const heavy = document.createElement('button');
  heavy.type = 'button';
  heavy.textContent = 'Ağır tekne';
  heavy.setAttribute('aria-label', 'Ölçüm için ağır tekne kur');
  heavy.addEventListener('click', options.onHeavy);
  box.append(text, heavy);
  parent.append(box);

  const sums = { compute: 0, draw: 0 };
  const counts = { compute: 0, draw: 0 };
  const shown = { compute: '–', draw: '–' };
  let frames = 0;
  let since = performance.now();

  function refresh(now: number): void {
    const fps = (frames * 1000) / (now - since);
    for (const kind of ['compute', 'draw'] as const) {
      // O saniyede hiç ölçüm yoksa son değer ekranda kalır.
      if (counts[kind] > 0) shown[kind] = decimal.format(sums[kind] / counts[kind]);
      sums[kind] = counts[kind] = 0;
    }
    const { drops, points } = options.stats();
    text.textContent = [
      `${number.format(fps)} kare/sn`,
      `damla ${number.format(drops)}`,
      `nokta ${number.format(points)}`,
      `hesap ${shown.compute} ms`,
      `çizim ${shown.draw} ms`,
    ].join('\n');
    frames = 0;
    since = now;
  }

  (function loop(now: number) {
    frames++;
    if (now - since >= REFRESH_MS) refresh(now);
    requestAnimationFrame(loop);
  })(since);
  refresh(since + 1);

  return {
    add(kind, ms) {
      sums[kind] += ms;
      counts[kind]++;
    },
  };
}
