import type { Params } from '../../src/engine/params';

// Testler bilerek varsayılan PARAMS'ı değil bu sabit kopyayı kullanır: his ayarı
// (params.ts) değiştiğinde testler kırılmasın, yalnız matematik doğrulansın.
// Değerler prototip v2'nin katsayılarıdır; altın dosya da bunlarla üretildi.
export const PROTOTYPE_PARAMS: Params = {
  drop: {
    points: 96,
    sizes: [13, 24, 40],
    maxDrops: 240,
    eps2: 1e-6,
    epsOffset: 0.01,
    toneJitter: 7,
    edgeShade: -30,
  },
  tine: { u: 0.93, k: 1.2, zMax: 14, range: 160 },
  comb: { u: 0.88, zMax: 9, spacing: 46 },
  refine: { threshold: 7, maxCoords: 3200 },
  sprinkle: { n: 16, rMin: 5, rMax: 31 },
  input: { minStep: 3, dropSpacing: 1.6 },
  opening: { n: 26, combLen: 7 },
  history: { checkpointEvery: 4, maxCheckpoints: 8 },
};

/** Tek noktalı "damla": tek bir noktanın nasıl hareket ettiğini izlemek için. */
export function pointDrop(x: number, y: number) {
  return { c: '#000000', e: '#000000', p: new Float32Array([x, y]) };
}
