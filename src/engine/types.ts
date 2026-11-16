// Engine'in çekirdek veri tipleri. DOM/Canvas bilgisi içermez.

/** Tuval (CSS piksel) koordinatında bir nokta. */
export type Vec2 = readonly [number, number];

/** Tek bir boya damlası: deforme olan kapalı nokta halkası. */
export type Drop = {
  /** Dolgu rengi (6 haneli hex). */
  c: string;
  /** Pigment kenar rengi (6 haneli hex). */
  e: string;
  /** Nokta halkası: [x0, y0, x1, y1, ...]. */
  p: Float32Array;
};

/** Pigment paleti. Renkler 6 haneli hex olmak zorunda (bkz. color.ts). */
export type Palette = {
  name: string;
  colors: readonly string[];
};

/**
 * Kullanıcının tek hamlesi. Tuval her zaman bir `Op[]` listesinin sonucudur;
 * bu yüzden her Op, sonucu tek başına belirleyen bütün bilgiyi taşır.
 */
export type Op =
  /** Tek damla. `c` nihai renktir (ton titreşimi uygulanmış hâli). */
  | { t: 'drop'; x: number; y: number; r: number; c: string }
  /** Biz: örneklenmiş yol; her ardışık nokta çifti bir çekme adımıdır. */
  | { t: 'tine'; path: Vec2[] }
  /** Tarak: örneklenmiş yol; her ardışık nokta çifti bir tarama adımıdır. */
  | { t: 'comb'; path: Vec2[] }
  /**
   * Serpme: `w`×`h` alanına `n` rastgele damla. Konum, boy ve ton `seed`'den
   * türer; renkler `colors` listesinden sırayla alınır.
   */
  | { t: 'sprinkle'; seed: number; n: number; w: number; h: number; colors: string[] }
  | { t: 'clear' };
