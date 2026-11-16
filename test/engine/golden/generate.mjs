// Altın dosya üreteci: beklenen değerler yeni engine'den DEĞİL, prototipin
// (prototip/ebru-studio.html, v2) kendi matematik fonksiyonlarından üretilir.
// Böylece testler "engine prototiple aynı sonucu veriyor mu?" sorusunu sorar.
//
// Çalıştırma (depo kökünden):  node test/engine/golden/generate.mjs
// Yalnız senaryolar bilerek değiştirildiğinde yeniden üretilir; his ayarı
// (params.ts) değişince yeniden üretmek gerekmez, testler sabit katsayı kullanır.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '../../../prototip/ebru-studio.html'), 'utf8');

// Prototipin matematik bölümünü (deformDrop, biz, tarak, refine) olduğu gibi al.
const start = html.indexOf('/* ---------- matematik');
const end = html.indexOf('/* ---------- işlemler');
if (start < 0 || end < 0 || end < start) throw new Error('Prototipte matematik bölümü bulunamadı');
const mathSource = html.slice(start, end);

/** Verilen `drops` dizisine bağlı prototip fonksiyonlarını döndürür. */
function prototype(drops) {
  return new Function('drops', `${mathSource}\nreturn { deformDrop, biz, tarak, refine };`)(drops);
}

// Prototipteki addDrop'un ton titreşimsiz hâli (titreşim Math.random kullandığı
// için referansa girmez; renk burada önemli değil, yalnız geometri karşılaştırılır).
function addDrop(drops, fn, x, y, r) {
  fn.deformDrop(x, y, r);
  const p = [];
  for (let a = 0; a < 96; a++) {
    const t = (a / 96) * 2 * Math.PI;
    p.push(x + r * Math.cos(t), y + r * Math.sin(t));
  }
  drops.push({ p });
  if (drops.length > 240) drops.shift();
}

function runSteps(steps) {
  const drops = [];
  const fn = prototype(drops);
  for (const s of steps) {
    if (s.k === 'drop') addDrop(drops, fn, s.x, s.y, s.r);
    else if (s.k === 'tine') fn.biz(s.x, s.y, s.mx, s.my, s.len);
    else if (s.k === 'comb') fn.tarak(s.x, s.y, s.mx, s.my, s.len);
    else if (s.k === 'refine') fn.refine();
    else throw new Error(`Bilinmeyen adım: ${s.k}`);
  }
  return drops;
}

// Op anlamı (state.ts ile aynı sıra): her hamle inceltmeyle biter; yolun her
// ardışık nokta çifti bir adımdır, sıfır uzunluklu adım atlanır.
function runOps(ops) {
  const drops = [];
  const fn = prototype(drops);
  for (const op of ops) {
    if (op.t === 'drop') addDrop(drops, fn, op.x, op.y, op.r);
    else if (op.t === 'tine' || op.t === 'comb') {
      for (let i = 1; i < op.path.length; i++) {
        const [x0, y0] = op.path[i - 1];
        const [x, y] = op.path[i];
        const dx = x - x0;
        const dy = y - y0;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;
        (op.t === 'tine' ? fn.biz : fn.tarak)(x, y, dx / len, dy / len, len);
      }
    } else throw new Error(`Bilinmeyen hamle: ${op.t}`);
    fn.refine();
  }
  return drops;
}

const round = (v) => Math.round(v * 1000) / 1000;
const snapshot = (drops) => drops.map((d) => d.p.map(round));

/* ---------- senaryolar ---------- */
const DROPS = [
  { k: 'drop', x: 200, y: 150, r: 24 },
  { k: 'drop', x: 215, y: 150, r: 13 },
  { k: 'drop', x: 120, y: 90, r: 40 },
  { k: 'drop', x: 200, y: 150, r: 13 }, // ilk damlanın tam merkezine
];
const TINE = [
  { k: 'tine', x: 160, y: 110, mx: Math.SQRT1_2, my: Math.SQRT1_2, len: 14.142 }, // zMax'a takılır
  { k: 'tine', x: 175, y: 118, mx: 0.882, my: 0.471, len: 6 },
  { k: 'tine', x: 190, y: 121, mx: 0.98, my: 0.196, len: 4 },
];
const COMB = [
  { k: 'comb', x: 200, y: 0, mx: 0, my: 1, len: 7 },
  { k: 'comb', x: 200, y: 9, mx: 0, my: 1, len: 9 },
  { k: 'comb', x: 210, y: 20, mx: 0.6, my: 0.8, len: 12 }, // zMax'a takılır, çapraz
];

const scenarios = [
  { name: 'damla', steps: DROPS },
  { name: 'biz', steps: [...DROPS, ...TINE] },
  { name: 'tarak', steps: [...DROPS, ...COMB] },
  {
    // Büyük damla + kenarına yakın damlalar + sert biz çekişleri: kenarların bir
    // kısmı eşiği aşar, bir kısmı aşmaz; ikinci inceltme kalanları da böler.
    name: 'inceltme',
    steps: [
      { k: 'drop', x: 200, y: 150, r: 60 },
      { k: 'drop', x: 255, y: 150, r: 30 },
      { k: 'refine' },
      { k: 'tine', x: 200, y: 110, mx: 0, my: -1, len: 20 },
      { k: 'tine', x: 200, y: 96, mx: 0, my: -1, len: 20 },
      { k: 'tine', x: 200, y: 82, mx: 0, my: -1, len: 20 },
      { k: 'refine' },
      ...COMB,
      { k: 'refine' },
    ],
  },
].map((s) => ({ ...s, expected: snapshot(runSteps(s.steps)) }));

const ops = [
  { t: 'drop', x: 200, y: 150, r: 24, c: '#1d3557' },
  { t: 'drop', x: 230, y: 160, r: 24, c: '#8a3324' },
  { t: 'tine', path: [[150, 100], [160, 110], [175, 118], [190, 121], [190, 121], [205, 140], [215, 165]] },
  { t: 'comb', path: [[200, 0], [200, 7], [200, 16]] },
  { t: 'drop', x: 212, y: 150, r: 40, c: '#c9a227' },
];

const out = {
  source: 'prototip/ebru-studio.html (v2) matematik fonksiyonları; bkz. generate.mjs',
  scenarios,
  opLog: { ops, expected: snapshot(runOps(ops)) },
};

// Okunur ama derli toplu çıktı: her nokta halkası tek satır.
const json = JSON.stringify(out, null, 1).replace(/\[\s+(-?[\d.]+,\s+)*-?[\d.]+\s+\]/g, (m) =>
  m.replace(/\s+/g, ''),
);
writeFileSync(join(here, 'prototype-v2.json'), json + '\n');
console.log(
  scenarios.map((s) => `${s.name}: ${s.expected.map((p) => p.length / 2).join('+')} nokta`).join('\n'),
);
console.log(`opLog: ${out.opLog.expected.map((p) => p.length / 2).join('+')} nokta`);
