// ★ Tüm his katsayıları bu dosyada. Başka yerde sihirli sayı olmaz;
// "tarak çok sert", "damla çok itiyor" gibi ayarlar yalnız buradan yapılır.
// Başlangıç değerleri prototip v2'de doğrulanan histir.

export type Params = {
  drop: {
    /** Yeni damlanın halkasındaki nokta sayısı. */
    points: number;
    /** Araç çubuğundaki damla boyları (yarıçap, px). */
    sizes: readonly number[];
    /** Teknedeki en çok damla sayısı; aşılınca en eski damla düşer. */
    maxDrops: number;
    /** Nokta damla merkezine bu kare-uzaklıktan yakınsa sıfıra bölme koruması devreye girer. */
    eps2: number;
    /** Koruma devredeyken noktanın merkezden sayıldığı uzaklık (px). */
    epsOffset: number;
    /** Pigment tonunun rastgele oynama genliği (±, renk kanalı birimi). */
    toneJitter: number;
    /** Kenar renginin dolguya göre ton farkı (eksi = koyu). */
    edgeShade: number;
  };
  tine: {
    /** Uzaklıkla sönüm tabanı: itme = z · u^uzaklık. */
    u: number;
    /** Adım uzunluğunu itme şiddetine çeviren çarpan. */
    k: number;
    /** Tek adımda en büyük itme (px). */
    zMax: number;
    /** Bizin etki menzili (px); ötesindeki noktalara dokunulmaz. */
    range: number;
  };
  comb: {
    /** Dişe uzaklıkla sönüm tabanı. */
    u: number;
    /** Tek adımda en büyük itme (px). */
    zMax: number;
    /** Diş aralığı (px). */
    spacing: number;
  };
  refine: {
    /** Komşu iki nokta arası bundan uzunsa araya orta nokta eklenir (px). */
    threshold: number;
    /**
     * Damla başına tavan, koordinat sayısı olarak (2 koordinat = 1 nokta).
     * Halkası bundan uzun damla artık inceltilmez.
     */
    maxCoords: number;
    /**
     * Teknedeki toplam nokta bütçesi. Aşılacaksa inceltme durur: çok taranmış
     * teknede ince şeritler köşeli kalabilir ama adım süresi sınırlı kalır.
     */
    maxTotalPoints: number;
    /**
     * İki ucu da teknenin aynı kenarının bu kadar (px) dışında kalan kenar
     * inceltilmez: görünmeyen yerde nokta harcanmaz.
     */
    outsideMargin: number;
  };
  sprinkle: {
    /** Serpme düğmesinin bıraktığı damla sayısı. */
    n: number;
    /** Serpme damlası yarıçap aralığı [rMin, rMax) (px). */
    rMin: number;
    rMax: number;
  };
  input: {
    /** İşaretçi bundan kısa hareket ettiyse adım sayılmaz (px). */
    minStep: number;
    /** Sürükleyerek damla dizerken iki damla arası yol, yarıçapın katı olarak. */
    dropSpacing: number;
  };
  opening: {
    /** Açılıştaki hazır battal zeminin damla sayısı. */
    n: number;
    /** Açılıştaki tek tarak geçişinin adım uzunluğu (px). */
    combLen: number;
  };
  history: {
    /** Kaç harekette bir ara anlık görüntü alınır (geri alma hızı için). */
    checkpointEvery: number;
    /** Saklanan en çok ara anlık görüntü; daha eskisi için baştan oynatılır. */
    maxCheckpoints: number;
  };
};

export const PARAMS: Params = {
  drop: {
    points: 96,
    sizes: [13, 24, 40],
    maxDrops: 240,
    eps2: 1e-6,
    epsOffset: 0.01,
    toneJitter: 7,
    edgeShade: -30,
  },
  tine: { u: 0.93, k: 1.2, zMax: 14, range: 160 },
  comb: { u: 0.88, zMax: 9, spacing: 46 },
  refine: { threshold: 7, maxCoords: 3200, maxTotalPoints: 96000, outsideMargin: 40 },
  sprinkle: { n: 16, rMin: 5, rMax: 31 },
  input: { minStep: 3, dropSpacing: 1.6 },
  opening: { n: 26, combLen: 7 },
  history: { checkpointEvery: 4, maxCheckpoints: 8 },
};
