// Hamle günlüğü ve geri alma. Geri alma, anlık görüntüye dönmek değil, son
// hareketin hamlelerini atıp listeyi yeniden oynatmaktır. Uzun seanslarda baştan
// oynatmak yavaş kalacağı için arada bir ara anlık görüntü alınır; yeniden
// oynatma en yakın ara görüntüden başlar. Sonuç her durumda baştan oynatmayla aynıdır.

import { PARAMS, type Params } from './params';
import { applyOp, createState, type MarblingState } from './state';
import type { Drop, Op } from './types';

type Checkpoint = {
  /** Bu görüntü, `ops[0..at)` uygulandıktan sonraki durumdur. */
  at: number;
  drops: Drop[];
  w: number;
  h: number;
};

export type History = {
  /** Baştan beri tüm hamleler. */
  ops: Op[];
  /** Geri alma sınırları: her hareketin başındaki hamle sayısı. */
  marks: number[];
  checkpoints: Checkpoint[];
};

export function createHistory(): History {
  return { ops: [], marks: [], checkpoints: [] };
}

function cloneDrops(drops: readonly Drop[]): Drop[] {
  return drops.map((d) => ({ c: d.c, e: d.e, p: d.p.slice() }));
}

/**
 * Bir kullanıcı hareketi (dokunuş, sürükleme, düğme) başlıyor. Hareketin
 * hamleleri `record` ile eklenir, `endGesture` ile kapatılır; geri alma
 * hareketin tamamını birden geri alır. `state` hareket ÖNCESİ durumdur.
 */
export function beginGesture(h: History, state: MarblingState, params: Params = PARAMS): void {
  h.marks.push(h.ops.length);
  const last = h.checkpoints[h.checkpoints.length - 1];
  if (h.marks.length % params.history.checkpointEvery !== 0) return;
  if (last && last.at === h.ops.length) return; // bu noktanın görüntüsü zaten var
  h.checkpoints.push({ at: h.ops.length, drops: cloneDrops(state.drops), w: state.w, h: state.h });
  if (h.checkpoints.length > params.history.maxCheckpoints) h.checkpoints.shift();
}

export function record(h: History, op: Op): void {
  h.ops.push(op);
}

/** Hareket bitti. Hiç hamle üretmediyse geri alınacak bir şey de bırakmaz. */
export function endGesture(h: History): void {
  if (h.marks[h.marks.length - 1] === h.ops.length) h.marks.pop();
}

/**
 * Son hareketi geri alır ve yeni durumu döndürür; geri alınacak hareket yoksa
 * `null`. Dönen durum, kalan hamle listesinin baştan oynatılmasıyla birebir aynıdır.
 */
export function undo(h: History, params: Params = PARAMS): MarblingState | null {
  const mark = h.marks.pop();
  if (mark === undefined) return null;
  h.ops.length = mark;
  while (h.checkpoints.length > 0 && h.checkpoints[h.checkpoints.length - 1].at > mark) {
    h.checkpoints.pop();
  }
  const base = h.checkpoints[h.checkpoints.length - 1];
  const state: MarblingState = base
    ? { drops: cloneDrops(base.drops), w: base.w, h: base.h }
    : createState();
  for (let i = base ? base.at : 0; i < mark; i++) applyOp(state, h.ops[i], params);
  return state;
}
