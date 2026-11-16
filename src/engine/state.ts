// Op günlüğü tek gerçek: tuval durumu, bir `Op[]` listesinin baştan
// uygulanmasının sonucudur. Geri alma, replay ve testler bu tek mekanizmaya dayanır.

import { addDrop, comb, refine, sprinkle, tine } from './marbling';
import { PARAMS, type Params } from './params';
import type { Drop, Op, Vec2 } from './types';

export type MarblingState = {
  /** Çizim sırasıyla damlalar (ilk eleman en altta). */
  drops: Drop[];
};

export function createState(): MarblingState {
  return { drops: [] };
}

/** Yolun her ardışık nokta çiftini bir araç adımı olarak uygular. */
function stroke(
  drops: readonly Drop[],
  step: typeof tine,
  path: readonly Vec2[],
  params: Params,
): void {
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x, y] = path[i];
    const dx = x - x0;
    const dy = y - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue; // yönü olmayan adım
    step(drops, x, y, dx / len, dy / len, len, params);
  }
}

/** Tek hamleyi uygular (durumu yerinde değiştirir); her hamle inceltmeyle biter. */
export function applyOp(state: MarblingState, op: Op, params: Params = PARAMS): void {
  switch (op.t) {
    case 'drop':
      addDrop(state.drops, op.x, op.y, op.r, op.c, params);
      break;
    case 'tine':
      stroke(state.drops, tine, op.path, params);
      break;
    case 'comb':
      stroke(state.drops, comb, op.path, params);
      break;
    case 'sprinkle':
      sprinkle(state.drops, op.seed, op.n, op.w, op.h, op.colors, params);
      break;
    case 'clear':
      state.drops = [];
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
