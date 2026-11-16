// Op günlüğü tek gerçek: tuval durumu, bir `Op[]` listesinin baştan
// uygulanmasının sonucudur. Geri alma, replay ve testler bu tek mekanizmaya dayanır.

import { addDrop, comb, refine, sprinkle, tine } from './marbling';
import { PARAMS, type Params } from './params';
import type { Drop, Op, Vec2 } from './types';

export type MarblingState = {
  /** Çizim sırasıyla damlalar (ilk eleman en altta). */
  drops: Drop[];
  /**
   * Teknenin boyutu (damla koordinatlarının birimiyle). Ekran boyutundan
   * bağımsızdır: ekran değişince tekne ekrana sığdırılır, durum değişmez.
   */
  w: number;
  h: number;
};

export function createState(): MarblingState {
  return { drops: [], w: 0, h: 0 };
}

/**
 * Biz ya da tarağın tek adımı: uç (x0, y0)'dan (x, y)'ye gider. Canlı çizim de
 * yeniden oynatma da bu fonksiyondan geçer; ikisinin sonucu bu yüzden aynıdır.
 */
export function strokeStep(
  drops: readonly Drop[],
  tool: 'tine' | 'comb',
  x0: number,
  y0: number,
  x: number,
  y: number,
  params: Params = PARAMS,
): void {
  const dx = x - x0;
  const dy = y - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) return; // yönü olmayan adım
  (tool === 'tine' ? tine : comb)(drops, x, y, dx / len, dy / len, len, params);
}

/** Yolun her ardışık nokta çiftini bir araç adımı olarak uygular. */
function stroke(
  drops: readonly Drop[],
  tool: 'tine' | 'comb',
  path: readonly Vec2[],
  params: Params,
): void {
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x, y] = path[i];
    strokeStep(drops, tool, x0, y0, x, y, params);
  }
}

/** Tek hamleyi uygular (durumu yerinde değiştirir); her hamle inceltmeyle biter. */
export function applyOp(state: MarblingState, op: Op, params: Params = PARAMS): void {
  switch (op.t) {
    case 'drop':
      addDrop(state.drops, op.x, op.y, op.r, op.c, params);
      break;
    case 'tine':
    case 'comb':
      stroke(state.drops, op.t, op.path, params);
      break;
    case 'sprinkle':
      sprinkle(state.drops, op.seed, op.n, op.w, op.h, op.colors, params);
      break;
    case 'clear':
      state.drops = [];
      state.w = op.w;
      state.h = op.h;
      return;
  }
  refine(state.drops, params);
}

/** Hamle listesini boş tekneden başlayarak oynatır. */
export function replayOps(ops: readonly Op[], params: Params = PARAMS): MarblingState {
  const state = createState();
  for (const op of ops) applyOp(state, op, params);
  return state;
}
