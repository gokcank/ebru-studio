import './theme.css';
import { PALETTES } from './engine/palettes';
import { replayOps } from './engine/state';
import type { Op } from './engine/types';
import { createRenderer } from './render/canvas';

// Geçici açılış (yalnız çizimi göstermek için): hazır bir battal zemin.
// Etkileşim, durum ve araç çubuğu sonraki adımda `ui/app.ts`'e taşınacak.
const canvas = document.querySelector<HTMLCanvasElement>('#tekne');
if (!canvas) throw new Error('#tekne bulunamadı');

const renderer = createRenderer(canvas);
renderer.fit();

const palette = PALETTES[0];
const opening: Op[] = [
  {
    t: 'sprinkle',
    seed: (Math.random() * 2 ** 32) >>> 0,
    n: 26,
    w: renderer.width,
    h: renderer.height,
    colors: [...palette.colors],
  },
  // Hafif tek tarak geçişi: yukarıdan aşağı.
  { t: 'comb', path: [[renderer.width / 2, -7], [renderer.width / 2, 0]] },
];
const state = replayOps(opening);

function water(): string {
  return getComputedStyle(document.body).getPropertyValue('--water').trim();
}
function redraw(): void {
  renderer.draw(state.drops, water());
}

redraw();
window.addEventListener('resize', () => {
  renderer.fit();
  redraw();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
