import { describe, expect, it } from 'vitest';
import { applyOp, createState, replayOps } from '../../src/engine/state';
import type { Op } from '../../src/engine/types';
import { PROTOTYPE_PARAMS as P } from './fixtures';
import golden from './golden/prototype-v2.json';

const ops = golden.opLog.ops as unknown as Op[];
const expected = golden.opLog.expected;

/** Engine float32, prototip float64 tuttuğu için küçük bir pay bırakılır (px). */
const TOLERANCE = 0.01;

describe('replayOps', () => {
  it('altın dosya: hamle listesi prototiple aynı noktaları verir', () => {
    const { drops } = replayOps(ops, P);
    expect(drops.map((d) => d.p.length)).toEqual(expected.map((p) => p.length));
    let worst = 0;
    drops.forEach((d, i) => {
      const e = expected[i] as number[];
      for (let j = 0; j < e.length; j++) worst = Math.max(worst, Math.abs(d.p[j] - e[j]));
    });
    expect(worst).toBeLessThan(TOLERANCE);
    expect(drops.map((d) => d.c)).toEqual(['#1d3557', '#8a3324', '#c9a227']);
  });

  it('deterministiktir: iki oynatma birebir aynıdır (serpme dahil)', () => {
    const list: Op[] = [
      { t: 'sprinkle', seed: 2026, n: 26, w: 400, h: 300, colors: ['#1d3557', '#8a3324'] },
      { t: 'comb', path: [[200, -7], [200, 0]] },
      ...ops,
    ];
    const a = replayOps(list, P).drops;
    const b = replayOps(list, P).drops;
    expect(a.length).toBe(29);
    a.forEach((d, i) => {
      expect(d.c).toBe(b[i]?.c);
      expect(Array.from(d.p)).toEqual(Array.from(b[i]?.p ?? []));
    });
  });

  it('geri alma: son hamle atılıp baştan oynatılınca önceki durum çıkar', () => {
    const state = createState();
    for (const op of ops.slice(0, -1)) applyOp(state, op, P);
    const before = state.drops.map((d) => Array.from(d.p));
    applyOp(state, ops[ops.length - 1] as Op, P);
    expect(state.drops.map((d) => Array.from(d.p))).not.toEqual(before);
    expect(replayOps(ops.slice(0, -1), P).drops.map((d) => Array.from(d.p))).toEqual(before);
  });

  it('boş liste boş tekne verir', () => {
    expect(replayOps([], P).drops).toEqual([]);
  });
});

describe('applyOp', () => {
  it('clear tekneyi boşaltır', () => {
    const state = replayOps(ops, P);
    applyOp(state, { t: 'clear' }, P);
    expect(state.drops).toEqual([]);
  });

  it('her hamle inceltmeyle biter: büyük damlanın uzun kenarları bölünür', () => {
    const state = createState();
    applyOp(state, { t: 'drop', x: 200, y: 150, r: 120, c: '#1d3557' }, P); // kenar ≈ 7,85 px
    expect(state.drops[0]?.p.length).toBe(P.drop.points * 4);
  });

  it('tek noktalı ya da yerinde sayan yol hiçbir şeyi oynatmaz', () => {
    const state = replayOps(ops.slice(0, 2), P);
    const before = state.drops.map((d) => Array.from(d.p));
    applyOp(state, { t: 'tine', path: [[200, 150]] }, P);
    applyOp(state, { t: 'comb', path: [[200, 150], [200, 150]] }, P);
    expect(state.drops.map((d) => Array.from(d.p))).toEqual(before);
  });
});
