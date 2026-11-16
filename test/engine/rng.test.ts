import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/engine/rng';

describe('createRng', () => {
  it('aynı tohum aynı diziyi verir', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('farklı tohum farklı dizi verir', () => {
    const a = createRng(1);
    const b = createRng(2);
    const same = Array.from({ length: 10 }, () => a() === b()).filter(Boolean).length;
    expect(same).toBe(0);
  });

  it('değerler [0, 1) aralığında ve kabaca düzgün dağılır', () => {
    const rand = createRng(7);
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });

  // Dizi sabitlenir: algoritma değişirse eski hamle listeleri başka sonuç verir.
  it('dizi sabittir (mulberry32)', () => {
    const rand = createRng(42);
    expect([rand(), rand(), rand()]).toEqual(PINNED_42);
  });
});

const PINNED_42 = [0.6011037519201636, 0.44829055899754167, 0.8524657934904099];
