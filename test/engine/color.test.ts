import { describe, expect, it } from 'vitest';
import { jitterTone, shade } from '../../src/engine/color';

describe('shade', () => {
  it('üç kanala da aynı miktarı ekler', () => {
    expect(shade('#808080', 10)).toBe('#8a8a8a');
    expect(shade('#1d3557', 5)).toBe('#223a5c');
  });

  it('0 ve 255 sınırına kıskaçlar', () => {
    expect(shade('#ffffff', 20)).toBe('#ffffff');
    expect(shade('#000000', -5)).toBe('#000000');
    expect(shade('#1d3557', -30)).toBe('#001739'); // kırmızı kanal 0'a dayanır
  });

  it('baştaki sıfırları korur', () => {
    expect(shade('#000a00', 0)).toBe('#000a00');
  });
});

describe('jitterTone', () => {
  it('rastgele sayıyı ±genlik aralığında ton farkına çevirir', () => {
    expect(jitterTone('#808080', 0, 7)).toBe('#797979'); // −7
    expect(jitterTone('#808080', 0.5, 7)).toBe('#808080'); // 0
    expect(jitterTone('#808080', 0.999, 7)).toBe('#868686'); // +6 (sıfıra doğru kırpma)
  });
});
