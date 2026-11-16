// Renk yardımcıları. Yalnız 6 haneli hex (#rrggbb) kabul edilir; palet kuralı budur.

/** Rengin üç kanalına `amt` ekler (eksi = koyulaştır), 0–255'e kıskaçlar. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Pigment tonunu hafifçe oynatır. `rand` [0, 1) aralığında bir sayıdır
 * (engine içinde tohumlu rng'den, UI'da serbest kaynaktan gelir).
 */
export function jitterTone(hex: string, rand: number, amount: number): string {
  return shade(hex, (rand * 2 * amount - amount) | 0);
}
