import { describe, expect, it } from 'vitest';
import { addDrop, comb, dropDeform, refine, sprinkle, tine } from '../../src/engine/marbling';
import type { Params } from '../../src/engine/params';
import type { Drop } from '../../src/engine/types';
import { PROTOTYPE_PARAMS as P, pointDrop } from './fixtures';
import golden from './golden/prototype-v2.json';

type Step =
  | { k: 'drop'; x: number; y: number; r: number }
  | { k: 'tine' | 'comb'; x: number; y: number; mx: number; my: number; len: number }
  | { k: 'refine' };
type Scenario = { name: string; steps: Step[]; expected: number[][] };

const scenarios = golden.scenarios as unknown as Scenario[];

function run(steps: Step[]): Drop[] {
  const drops: Drop[] = [];
  for (const s of steps) {
    if (s.k === 'drop') addDrop(drops, s.x, s.y, s.r, '#808080', P);
    else if (s.k === 'tine') tine(drops, s.x, s.y, s.mx, s.my, s.len, P);
    else if (s.k === 'comb') comb(drops, s.x, s.y, s.mx, s.my, s.len, P);
    else refine(drops, P);
  }
  return drops;
}

/** Engine float32, prototip float64 tuttuğu için küçük bir pay bırakılır (px). */
const TOLERANCE = 0.01;

function expectPoints(drops: Drop[], expected: number[][]): void {
  expect(drops.map((d) => d.p.length)).toEqual(expected.map((p) => p.length));
  let worst = 0;
  drops.forEach((d, i) => {
    const e = expected[i] as number[];
    for (let j = 0; j < e.length; j++) worst = Math.max(worst, Math.abs(d.p[j] - e[j]));
  });
  expect(worst).toBeLessThan(TOLERANCE);
}

describe('altın dosya: prototip v2 ile aynı sonuç', () => {
  it.each(scenarios.map((s) => [s.name, s] as const))('%s', (_name, s) => {
    expectPoints(run(s.steps), s.expected);
  });

  it('inceltme senaryosu gerçekten nokta ekliyor', () => {
    const s = scenarios.find((x) => x.name === 'inceltme') as Scenario;
    expect(s.expected.some((p) => p.length > P.drop.points * 2)).toBe(true);
  });
});

describe('dropDeform', () => {
  it('noktayı merkezden dışa iter: uzaklık √(d² + r²) olur', () => {
    const d = pointDrop(103, 104); // merkeze uzaklık 5
    dropDeform([d], 100, 100, 12, P);
    expect(Math.hypot(d.p[0] - 100, d.p[1] - 100)).toBeCloseTo(13, 4); // 5-12-13
    expect((d.p[1] - 100) / (d.p[0] - 100)).toBeCloseTo(4 / 3, 4); // yön korunur
  });

  it('tam merkezdeki nokta sıfıra bölmez', () => {
    const d = pointDrop(100, 100);
    dropDeform([d], 100, 100, 24, P);
    expect(Number.isFinite(d.p[0])).toBe(true);
    expect(Number.isFinite(d.p[1])).toBe(true);
    expect(d.p[0]).toBeCloseTo(100 + Math.sqrt(P.drop.epsOffset ** 2 + 24 ** 2), 3);
    expect(d.p[1]).toBeCloseTo(100, 5);
  });
});

describe('addDrop', () => {
  it('yarıçapı r olan kapalı halka ekler; kenar rengi koyu tondur', () => {
    const drops: Drop[] = [];
    addDrop(drops, 50, 60, 24, '#8a3324', P);
    const d = drops[0] as Drop;
    expect(d.p.length).toBe(P.drop.points * 2);
    for (let i = 0; i < d.p.length; i += 2) {
      expect(Math.hypot(d.p[i] - 50, d.p[i + 1] - 60)).toBeCloseTo(24, 3);
    }
    expect(d.c).toBe('#8a3324');
    expect(d.e).toBe('#6c1506');
  });

  it('tavan aşılınca en eski damla düşer', () => {
    const params: Params = { ...P, drop: { ...P.drop, maxDrops: 3 } };
    const drops: Drop[] = [];
    ['#000001', '#000002', '#000003', '#000004'].forEach((c, i) => {
      addDrop(drops, 100 + i * 50, 100, 10, c, params);
    });
    expect(drops.map((d) => d.c)).toEqual(['#000002', '#000003', '#000004']);
  });
});

describe('tine', () => {
  it('uçtaki nokta tam z kadar, uzaktaki u^d ile sönerek çekilir', () => {
    const near = pointDrop(100, 100);
    const far = pointDrop(110, 100);
    tine([near, far], 100, 100, 0, 1, 5, P); // z = 5 · 1.2 = 6
    expect(near.p[1] - 100).toBeCloseTo(6, 4);
    expect(far.p[1] - 100).toBeCloseTo(6 * 0.93 ** 10, 4);
    expect(near.p[0]).toBe(100); // yöne dik kayma yok
  });

  it('itme zMax ile sınırlıdır', () => {
    const d = pointDrop(100, 100);
    tine([d], 100, 100, 1, 0, 500, P);
    expect(d.p[0] - 100).toBeCloseTo(P.tine.zMax, 4);
  });

  it('menzil dışındaki noktaya dokunmaz', () => {
    const d = pointDrop(100 + P.tine.range + 1, 100);
    tine([d], 100, 100, 0, 1, 10, P);
    expect(Array.from(d.p)).toEqual([100 + P.tine.range + 1, 100]);
  });
});

describe('comb', () => {
  it('diş üstündeki nokta tam z kadar çekilir; desen diş aralığıyla yinelenir', () => {
    const s = P.comb.spacing;
    const onTooth = pointDrop(100, 50);
    const nextTooth = pointDrop(100 + s, 50);
    const farTooth = pointDrop(100 - 3 * s, 50);
    comb([onTooth, nextTooth, farTooth], 100, 0, 0, 1, 5, P); // dişler dikey, z = 5
    for (const d of [onTooth, nextTooth, farTooth]) expect(d.p[1] - 50).toBeCloseTo(5, 4);
  });

  it('iki dişin tam ortası en az etkilenir', () => {
    const s = P.comb.spacing;
    const mid = pointDrop(100 + s / 2, 50);
    const quarter = pointDrop(100 + s / 4, 50);
    comb([mid, quarter], 100, 0, 0, 1, 5, P);
    expect(mid.p[1] - 50).toBeCloseTo(5 * 0.88 ** (s / 2), 4);
    expect(quarter.p[1] - 50).toBeCloseTo(5 * 0.88 ** (s / 4), 4);
    expect(mid.p[1]).toBeLessThan(quarter.p[1]);
  });

  it('itme zMax ile sınırlıdır', () => {
    const d = pointDrop(100, 50);
    comb([d], 100, 0, 0, 1, 500, P);
    expect(d.p[1] - 50).toBeCloseTo(P.comb.zMax, 4);
  });
});

describe('refine', () => {
  it('yalnız eşiği aşan kenara orta nokta ekler (kapanış kenarı dahil)', () => {
    // Kare: iki kenar 10 (eşik 7'nin üstü), iki kenar 5 (altı).
    const d: Drop = { c: '#000000', e: '#000000', p: new Float32Array([0, 0, 10, 0, 10, 5, 0, 5]) };
    refine([d], P);
    expect(Array.from(d.p)).toEqual([0, 0, 5, 0, 10, 0, 10, 5, 5, 5, 0, 5]);
  });

  it('eşiği aşan kenar yoksa halkaya dokunmaz', () => {
    const p = new Float32Array([0, 0, 5, 0, 5, 5, 0, 5]);
    const d: Drop = { c: '#000000', e: '#000000', p };
    refine([d], P);
    expect(d.p).toBe(p);
  });

  it('tavanı aşmış damlayı inceltmez', () => {
    const params: Params = { ...P, refine: { ...P.refine, maxCoords: 6 } };
    const p = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]); // 8 koordinat > 6
    const d: Drop = { c: '#000000', e: '#000000', p };
    refine([d], params);
    expect(d.p).toBe(p);
  });
});

describe('sprinkle', () => {
  const colors = ['#1d3557', '#8a3324', '#f4ead5'];
  const make = (seed: number) => {
    const drops: Drop[] = [];
    sprinkle(drops, seed, 16, 400, 300, colors, P);
    return drops;
  };

  it('aynı tohum birebir aynı tekneyi verir', () => {
    const a = make(99);
    const b = make(99);
    expect(a.map((d) => d.c)).toEqual(b.map((d) => d.c));
    a.forEach((d, i) => expect(Array.from(d.p)).toEqual(Array.from((b[i] as Drop).p)));
  });

  it('farklı tohum farklı tekne verir', () => {
    expect(Array.from((make(1)[0] as Drop).p)).not.toEqual(Array.from((make(2)[0] as Drop).p));
  });

  it('n damla bırakır; son damla alanın içinde ve boy aralığındadır', () => {
    const drops = make(5);
    expect(drops.length).toBe(16);
    // Son damlayı kimse itmedi: hâlâ tam bir çember.
    const p = (drops[15] as Drop).p;
    const n = p.length / 2;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < p.length; i += 2) {
      cx += p[i] / n;
      cy += p[i + 1] / n;
    }
    const r = Math.hypot(p[0] - cx, p[1] - cy);
    expect(cx).toBeGreaterThanOrEqual(0);
    expect(cx).toBeLessThan(400);
    expect(cy).toBeGreaterThanOrEqual(0);
    expect(cy).toBeLessThan(300);
    expect(r).toBeGreaterThanOrEqual(P.sprinkle.rMin - 1e-3);
    expect(r).toBeLessThan(P.sprinkle.rMax + 1e-3);
  });

  it('renkleri sırayla alır; ton en çok ±genlik kadar oynar', () => {
    const channel = (hex: string) => parseInt(hex.slice(5), 16); // mavi kanal
    make(5).forEach((d, i) => {
      const base = colors[i % colors.length] as string;
      // #f4ead5 gibi açık renklerde kıskaç olmaz: mavi kanal 0xd5 + 7 < 255.
      expect(Math.abs(channel(d.c) - channel(base))).toBeLessThanOrEqual(P.drop.toneJitter);
    });
  });

  it('renk listesi boşsa hiçbir şey yapmaz', () => {
    const drops: Drop[] = [];
    sprinkle(drops, 1, 16, 400, 300, [], P);
    expect(drops.length).toBe(0);
  });
});
