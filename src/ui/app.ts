// Uygulamanın gövdesi: durum, hamle günlüğü, işaretçi akışı. Engine ile render'ı bağlar.

import { jitterTone } from '../engine/color';
import { beginGesture, createHistory, endGesture, record, undo } from '../engine/history';
import { refine } from '../engine/marbling';
import { PALETTES } from '../engine/palettes';
import { PARAMS } from '../engine/params';
import { applyOp, createState, strokeStep } from '../engine/state';
import type { Op, Vec2 } from '../engine/types';
import { createRenderer, type Theme } from '../render/canvas';
import { createToast } from './toast';
import { createToolbar, type ToolId } from './toolbar';

function must<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`${selector} bulunamadı`);
  return el;
}

export function startApp(): void {
  const canvas = must<HTMLCanvasElement>('#tekne');
  const renderer = createRenderer(canvas);
  const toast = createToast(must('#toast'));

  /* ---------- durum ---------- */
  let state = createState();
  const history = createHistory();
  let tool: ToolId = 'drop';
  let dropR = PARAMS.drop.sizes[1] ?? PARAMS.drop.sizes[0];
  let paletteIx = 0;
  let colorIx = 0;
  let autoCycle = true;

  /* ---------- çizim: yalnız gerektiğinde, kare başına en çok bir kez ---------- */
  let frame = 0;
  function invalidate(): void {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const style = getComputedStyle(document.body);
      const theme: Theme = {
        water: style.getPropertyValue('--water').trim(),
        bench: style.getPropertyValue('--bench').trim(),
        line: style.getPropertyValue('--line').trim(),
      };
      renderer.draw(state.drops, state, theme);
    });
  }

  /* ---------- renk ---------- */
  function nextColor(): string {
    const colors = PALETTES[paletteIx].colors;
    if (autoCycle) colorIx = (colorIx + 1) % colors.length;
    return colors[colorIx];
  }

  /* ---------- hamleler ---------- */
  /** Hamleyi uygular ve günlüğe yazar. */
  function commit(op: Op): void {
    applyOp(state, op);
    record(history, op);
    invalidate();
  }

  function dropAt(x: number, y: number): void {
    const c = jitterTone(nextColor(), Math.random(), PARAMS.drop.toneJitter);
    commit({ t: 'drop', x, y, r: dropR, c });
  }

  function sprinkleOp(n: number): Op {
    const colors = PALETTES[paletteIx].colors;
    // Renk sırası: otomatik dönüş açıksa sıradaki renkten başlayarak palet; kapalıysa tek renk.
    const order = autoCycle
      ? colors.map((_, i) => colors[(colorIx + 1 + i) % colors.length])
      : [colors[colorIx]];
    if (autoCycle) colorIx = (colorIx + n) % colors.length;
    return {
      t: 'sprinkle',
      seed: (Math.random() * 2 ** 32) >>> 0,
      n,
      w: state.w,
      h: state.h,
      colors: order,
    };
  }

  /** Düğmeyle yapılan tek hamlelik hareket. */
  function gesture(op: Op): void {
    beginGesture(history, state);
    commit(op);
    endGesture(history);
  }

  /* ---------- işaretçi akışı ---------- */
  let pointerId: number | null = null;
  let activeTool: ToolId = tool;
  let px = 0;
  let py = 0;
  let moved = 0;
  let path: Vec2[] = [];

  /** İşaretçinin tekne koordinatındaki konumu (tekne dışına taşabilir). */
  function position(e: PointerEvent): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return renderer.toBasin(e.clientX - rect.left, e.clientY - rect.top, state);
  }

  /** Konumu tekne sınırına kıskaçlar: sürüklerken dışarı taşan hamle kenarda kalır. */
  function clamp([x, y]: Vec2): Vec2 {
    return [Math.max(0, Math.min(state.w, x)), Math.max(0, Math.min(state.h, y))];
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (pointerId !== null || e.button !== 0) return;
    const [x0, y0] = position(e);
    if (x0 < 0 || y0 < 0 || x0 > state.w || y0 > state.h) return; // tekne dışı: çizilmez
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    px = x0;
    py = y0;
    moved = 0;
    activeTool = tool;
    beginGesture(history, state);
    if (activeTool === 'drop') dropAt(px, py);
    else path = [[px, py]];
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const [x, y] = clamp(position(e));
    const len = Math.hypot(x - px, y - py);
    if (len < PARAMS.input.minStep) return;
    moved += len;
    if (activeTool === 'drop') {
      if (moved > dropR * PARAMS.input.dropSpacing) {
        dropAt(x, y);
        moved = 0;
      }
    } else {
      strokeStep(state.drops, activeTool, px, py, x, y);
      path.push([x, y]);
      invalidate();
    }
    px = x;
    py = y;
  });

  function finish(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (activeTool !== 'drop' && path.length > 1) {
      // Canlı adımlar zaten uygulandı; hamle inceltmeyle biter ve günlüğe yazılır.
      refine(state.drops);
      record(history, { t: activeTool, path });
      invalidate();
    }
    path = [];
    endGesture(history);
  }
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  /* ---------- araç çubuğu ---------- */
  const toolbar = createToolbar(must('#bar'), PARAMS.drop.sizes, {
    onTool(next) {
      tool = next;
      toolbar.setTool(tool);
    },
    onSprinkle() {
      gesture(sprinkleOp(PARAMS.sprinkle.n));
      toast(`Serpme: ${PARAMS.sprinkle.n} damla`);
    },
    onSize(r) {
      dropR = r;
      toolbar.setSize(r);
    },
    onColor(index) {
      colorIx = index;
      toolbar.setPalette(PALETTES[paletteIx], colorIx);
    },
    onAutoCycle() {
      autoCycle = !autoCycle;
      toolbar.setAutoCycle(autoCycle);
      toast(autoCycle ? 'Renkler sırayla değişecek' : 'Renk sabit');
    },
    onUndo() {
      if (pointerId !== null) return; // sürükleme bitmeden geri alınmaz
      const previous = undo(history);
      if (!previous) {
        toast('Geri alınacak hamle yok');
        return;
      }
      state = previous;
      invalidate();
    },
    onPaletteCycle() {
      paletteIx = (paletteIx + 1) % PALETTES.length;
      colorIx = 0;
      toolbar.setPalette(PALETTES[paletteIx], colorIx);
      toast(`Palet: ${PALETTES[paletteIx].name}`);
    },
    onClear() {
      // Yeni tekne o anki ekranı tam doldurur.
      gesture({ t: 'clear', w: renderer.width, h: renderer.height });
      toast('Tekne temizlendi');
    },
  });
  toolbar.setTool(tool);
  toolbar.setSize(dropR);
  toolbar.setAutoCycle(autoCycle);
  toolbar.setPalette(PALETTES[paletteIx], colorIx);

  /* ---------- boyut ve tema ---------- */
  window.addEventListener('resize', () => {
    renderer.fit();
    invalidate();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', invalidate);

  /* ---------- açılış: hazır bir battal zemin (geri alınamaz) ---------- */
  renderer.fit();
  commit({ t: 'clear', w: renderer.width, h: renderer.height }); // teknenin başlangıç boyutu
  const mid = state.w / 2;
  commit(sprinkleOp(PARAMS.opening.n));
  commit({ t: 'comb', path: [[mid, -PARAMS.opening.combLen], [mid, 0]] });
}
