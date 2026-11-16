import { describe, expect, it } from 'vitest';
import { beginGesture, createHistory, endGesture, record, undo } from '../../src/engine/history';
import { refine } from '../../src/engine/marbling';
import type { Params } from '../../src/engine/params';
import {
  applyOp,
  createState,
  replayOps,
  strokeStep,
  type MarblingState,
} from '../../src/engine/state';
import type { Op, Vec2 } from '../../src/engine/types';
import { PROTOTYPE_PARAMS as P } from './fixtures';

const points = (s: MarblingState) => s.drops.map((d) => Array.from(d.p));
const colors = (s: MarblingState) => s.drops.map((d) => d.c);

/** Arayüzün yaptığını taklit eder: canlı çizim + günlük. */
function session(params: Params) {
  const h = createHistory();
  let state = createState();
  const commit = (op: Op) => {
    applyOp(state, op, params);
    record(h, op);
  };
  return {
    h,
    get state() {
      return state;
    },
    /** Düğme ya da tek dokunuş: bir hareket, bir ya da birkaç hamle. */
    gesture(...ops: Op[]) {
      beginGesture(h, state, params);
      ops.forEach(commit);
      endGesture(h);
    },
    /** Sürükleme: adımlar canlı uygulanır, hamle parmak kalkınca yazılır. */
    drag(tool: 'tine' | 'comb', path: Vec2[]) {
      beginGesture(h, state, params);
      for (let i = 1; i < path.length; i++) {
        strokeStep(state.drops, tool, path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], params);
      }
      if (path.length > 1) {
        refine(state.drops, params);
        record(h, { t: tool, path });
      }
      endGesture(h);
    },
    undo() {
      const previous = undo(h, params);
      if (previous) state = previous;
      return previous !== null;
    },
  };
}

/** 14 hareketlik karışık bir seans. */
function play(s: ReturnType<typeof session>): void {
  s.gesture({ t: 'sprinkle', seed: 7, n: 12, w: 400, h: 300, colors: ['#1d3557', '#8a3324'] });
  for (let i = 0; i < 4; i++) {
    s.gesture({ t: 'drop', x: 80 + i * 70, y: 150, r: 24, c: '#c9a227' });
    s.drag('tine', [[60 + i * 40, 60], [75 + i * 40, 90], [95 + i * 40, 130], [100 + i * 40, 170]]);
    s.drag('comb', [[200, 20 + i * 30], [200, 28 + i * 30], [204, 37 + i * 30]]);
  }
  // Sürükleyerek dizilen damlalar: tek hareket, üç hamle.
  s.gesture(
    { t: 'drop', x: 100, y: 220, r: 13, c: '#3f5e3a' },
    { t: 'drop', x: 125, y: 222, r: 13, c: '#3f5e3a' },
    { t: 'drop', x: 150, y: 226, r: 13, c: '#3f5e3a' },
  );
}

describe('history', () => {
  it('canlı çizimin sonucu, günlüğün baştan oynatılmasıyla birebir aynıdır', () => {
    const s = session(P);
    play(s);
    const replayed = replayOps(s.h.ops, P);
    expect(points(s.state)).toEqual(points(replayed));
    expect(colors(s.state)).toEqual(colors(replayed));
  });

  it('her geri alma, kalan günlüğün baştan oynatılmasıyla birebir aynı durumu verir', () => {
    const s = session(P);
    play(s);
    expect(s.h.checkpoints.length).toBeGreaterThan(0); // ara görüntüler gerçekten kullanılıyor
    let steps = 0;
    while (s.undo()) {
      steps++;
      const replayed = replayOps(s.h.ops, P);
      expect(points(s.state)).toEqual(points(replayed));
      expect(colors(s.state)).toEqual(colors(replayed));
    }
    expect(steps).toBe(14);
    expect(s.h.ops).toEqual([]);
    expect(s.state.drops).toEqual([]);
  });

  it('ara görüntü tavanı aşılınca da (eskiler silinince) sonuç aynıdır', () => {
    const tight: Params = { ...P, history: { checkpointEvery: 2, maxCheckpoints: 2 } };
    const s = session(tight);
    play(s);
    expect(s.h.checkpoints.length).toBe(2);
    while (s.undo()) expect(points(s.state)).toEqual(points(replayOps(s.h.ops, tight)));
    expect(s.state.drops).toEqual([]);
  });

  it('geri alıp devam edince de günlük ile durum uyumlu kalır', () => {
    const s = session(P);
    play(s);
    for (let i = 0; i < 5; i++) s.undo();
    play(s);
    for (let i = 0; i < 3; i++) s.undo();
    expect(points(s.state)).toEqual(points(replayOps(s.h.ops, P)));
  });

  it('sürükleyerek dizilen damlalar tek seferde geri alınır', () => {
    const s = session(P);
    play(s);
    const before = s.state.drops.length;
    s.undo();
    expect(s.state.drops.length).toBe(before - 3);
  });

  it('hamle üretmeyen hareket geri alma hakkı bırakmaz', () => {
    const s = session(P);
    s.gesture({ t: 'drop', x: 100, y: 100, r: 24, c: '#1d3557' });
    s.drag('tine', [[50, 50]]); // dokunup hiç sürüklememek
    expect(s.h.marks.length).toBe(1);
    expect(s.undo()).toBe(true);
    expect(s.undo()).toBe(false);
  });

  it('hareket dışı yazılan hamleler (açılış) geri alınamaz', () => {
    const h = createHistory();
    const state = createState();
    const opening: Op = { t: 'sprinkle', seed: 1, n: 5, w: 400, h: 300, colors: ['#1d3557'] };
    applyOp(state, opening, P);
    record(h, opening);
    expect(undo(h, P)).toBeNull();
    expect(h.ops.length).toBe(1);
  });

  it('temizle de geri alınır; teknenin eski boyutu da geri gelir', () => {
    const s = session(P);
    s.gesture({ t: 'clear', w: 400, h: 300 });
    s.gesture({ t: 'drop', x: 100, y: 100, r: 24, c: '#1d3557' });
    s.gesture({ t: 'clear', w: 800, h: 200 });
    expect(s.state.drops.length).toBe(0);
    expect([s.state.w, s.state.h]).toEqual([800, 200]);
    s.undo();
    expect(s.state.drops.length).toBe(1);
    expect([s.state.w, s.state.h]).toEqual([400, 300]);
  });

  it('ara görüntüden dönülünce de tekne boyutu korunur', () => {
    const every: Params = { ...P, history: { checkpointEvery: 1, maxCheckpoints: 8 } };
    const s = session(every);
    s.gesture({ t: 'clear', w: 640, h: 360 });
    s.gesture({ t: 'drop', x: 100, y: 100, r: 24, c: '#1d3557' });
    s.gesture({ t: 'drop', x: 200, y: 100, r: 24, c: '#1d3557' });
    s.undo();
    expect(s.h.checkpoints.length).toBeGreaterThan(0);
    expect([s.state.w, s.state.h, s.state.drops.length]).toEqual([640, 360, 1]);
  });
});
