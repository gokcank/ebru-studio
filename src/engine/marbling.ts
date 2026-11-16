// Klasik sayısal ebru ("mathematical marbling"): her damla, deforme olan kapalı
// bir nokta halkasıdır. Buradaki fonksiyonlar verilen `drops` dizisini YERİNDE
// değiştirir (her işaretçi hareketinde yüz binlerce nokta kopyalamamak için);
// bunun dışında hiçbir yan etkileri yoktur.

import { jitterTone, shade } from './color';
import { PARAMS, type Params } from './params';
import { createRng } from './rng';
import type { Drop } from './types';

/**
 * Damla itmesi: merkezi (cx, cy), yarıçapı r olan yeni damla mevcut noktaları dışa iter.
 * P' = C + (P − C) · √(1 + r² / |P − C|²)
 */
export function dropDeform(
  drops: readonly Drop[],
  cx: number,
  cy: number,
  r: number,
  params: Params = PARAMS,
): void {
  const r2 = r * r;
  const { eps2, epsOffset } = params.drop;
  for (const d of drops) {
    const p = d.p;
    for (let i = 0; i < p.length; i += 2) {
      let dx = p[i] - cx;
      let dy = p[i + 1] - cy;
      let q = dx * dx + dy * dy;
      if (q < eps2) {
        // Nokta tam merkezde: sıfıra bölme koruması.
        dx = epsOffset;
        dy = 0;
        q = epsOffset * epsOffset;
      }
      const s = Math.sqrt(1 + r2 / q);
      p[i] = cx + dx * s;
      p[i + 1] = cy + dy * s;
    }
  }
}

/** Yeni damla: önce eskileri iter, sonra kendi halkasını ekler. `c` nihai renktir. */
export function addDrop(
  drops: Drop[],
  x: number,
  y: number,
  r: number,
  c: string,
  params: Params = PARAMS,
): void {
  dropDeform(drops, x, y, r, params);
  const n = params.drop.points;
  const p = new Float32Array(n * 2);
  for (let a = 0; a < n; a++) {
    const t = (a / n) * 2 * Math.PI;
    p[a * 2] = x + r * Math.cos(t);
    p[a * 2 + 1] = y + r * Math.sin(t);
  }
  drops.push({ c, e: shade(c, params.drop.edgeShade), p });
  if (drops.length > params.drop.maxDrops) drops.shift();
}

/**
 * Biz adımı: uç (x, y) noktasında, birim yön (mx, my), adım uzunluğu `len`.
 * P' = P + M · z · u^d,  d = |P − uç|,  z = min(len · k, zMax)
 */
export function tine(
  drops: readonly Drop[],
  x: number,
  y: number,
  mx: number,
  my: number,
  len: number,
  params: Params = PARAMS,
): void {
  const { u, k, zMax, range } = params.tine;
  const z = Math.min(len * k, zMax);
  for (const d of drops) {
    const p = d.p;
    for (let i = 0; i < p.length; i += 2) {
      const dist = Math.hypot(p[i] - x, p[i + 1] - y);
      if (dist > range) continue;
      const f = z * Math.pow(u, dist);
      p[i] += mx * f;
      p[i + 1] += my * f;
    }
  }
}

/**
 * Tarak adımı: dişler sürükleme yönüne (mx, my) paralel çizgilerdir ve yöne dik
 * doğrultuda `spacing` aralıkla dizilir; tüm tekneyi etkiler.
 * t = ((P − uç) · N) mod aralık,  d = min(t, aralık − t),  P' = P + M · z · u^d
 */
export function comb(
  drops: readonly Drop[],
  x: number,
  y: number,
  mx: number,
  my: number,
  len: number,
  params: Params = PARAMS,
): void {
  const { u, zMax, spacing } = params.comb;
  const z = Math.min(len, zMax);
  const nx = -my;
  const ny = mx;
  for (const d of drops) {
    const p = d.p;
    for (let i = 0; i < p.length; i += 2) {
      let t = ((p[i] - x) * nx + (p[i + 1] - y) * ny) % spacing;
      if (t < 0) t += spacing;
      const dist = Math.min(t, spacing - t);
      const f = z * Math.pow(u, dist);
      p[i] += mx * f;
      p[i + 1] += my * f;
    }
  }
}

/**
 * İnceltme: gerilen kenarlara orta nokta ekler ki eğriler köşeli görünmesin.
 * Halkası tavanı aşmış damlaya dokunulmaz (nokta patlamasına karşı).
 */
export function refine(drops: readonly Drop[], params: Params = PARAMS): void {
  const { threshold, maxCoords } = params.refine;
  const limit2 = threshold * threshold;
  for (const d of drops) {
    const p = d.p;
    const n = p.length;
    if (n > maxCoords) continue;

    let extra = 0;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      const dx = p[j] - p[i];
      const dy = p[j + 1] - p[i + 1];
      if (dx * dx + dy * dy > limit2) extra++;
    }
    if (extra === 0) continue;

    const out = new Float32Array(n + extra * 2);
    let o = 0;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      const dx = p[j] - p[i];
      const dy = p[j + 1] - p[i + 1];
      out[o++] = p[i];
      out[o++] = p[i + 1];
      if (dx * dx + dy * dy > limit2) {
        out[o++] = (p[i] + p[j]) / 2;
        out[o++] = (p[i + 1] + p[j + 1]) / 2;
      }
    }
    d.p = out;
  }
}

/**
 * Serpme: `w`×`h` alanına `n` damla. Konum, yarıçap ve ton titreşimi `seed`'den
 * türer; renkler `colors` listesinden sırayla alınır. Aynı girdi aynı sonucu verir.
 */
export function sprinkle(
  drops: Drop[],
  seed: number,
  n: number,
  w: number,
  h: number,
  colors: readonly string[],
  params: Params = PARAMS,
): void {
  if (colors.length === 0) return;
  const rand = createRng(seed);
  const { rMin, rMax } = params.sprinkle;
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rMin + rand() * (rMax - rMin);
    const c = jitterTone(colors[i % colors.length], rand(), params.drop.toneJitter);
    addDrop(drops, x, y, r, c, params);
  }
}
