// Araç çubuğu: araçlar, damla boyları, renkler, palet, geri al, temizle.
// Durum tutmaz; tıklamaları `handlers` ile bildirir, görünümü `set…` ile alır.

import type { Palette } from '../engine/types';

export type ToolId = 'drop' | 'tine' | 'comb';

export type ToolbarHandlers = {
  onTool(tool: ToolId): void;
  onSprinkle(): void;
  onSize(r: number): void;
  onColor(index: number): void;
  onAutoCycle(): void;
  onUndo(): void;
  onPaletteCycle(): void;
  onClear(): void;
};

export type Toolbar = {
  setTool(tool: ToolId): void;
  setSize(r: number): void;
  setAutoCycle(on: boolean): void;
  setPalette(palette: Palette, colorIndex: number): void;
};

/** Boy düğmelerinin adları (küçükten büyüğe) ve içlerindeki noktanın çapı (px). */
const SIZE_NAMES = ['küçük damla', 'orta damla', 'büyük damla'];
const SIZE_DOTS = [8, 13, 18];

function must<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Araç çubuğunda ${selector} bulunamadı`);
  return el;
}

/** Gruptaki düğmelerden yalnız `match` olanı basılı gösterir. */
function press(group: HTMLElement, match: (b: HTMLButtonElement) => boolean): void {
  group.querySelectorAll<HTMLButtonElement>('button[aria-pressed]').forEach((b) => {
    b.setAttribute('aria-pressed', String(match(b)));
  });
}

export function createToolbar(
  root: HTMLElement,
  sizes: readonly number[],
  handlers: ToolbarHandlers,
): Toolbar {
  const tools = must<HTMLElement>(root, '#tools');
  const sizeGroup = must<HTMLElement>(root, '#sizes');
  const swatches = must<HTMLElement>(root, '#swatches');
  const auto = must<HTMLButtonElement>(root, '#auto');
  const paletteButton = must<HTMLButtonElement>(root, '#palette');
  const paletteName = must<HTMLElement>(paletteButton, '.lbl');

  tools.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-tool]');
    if (b) handlers.onTool(b.dataset.tool as ToolId);
  });
  must(root, '#sprinkle').addEventListener('click', handlers.onSprinkle);
  auto.addEventListener('click', handlers.onAutoCycle);
  must(root, '#undo').addEventListener('click', handlers.onUndo);
  paletteButton.addEventListener('click', handlers.onPaletteCycle);
  must(root, '#clear').addEventListener('click', handlers.onClear);

  sizes.forEach((r, i) => {
    const b = document.createElement('button');
    const name = SIZE_NAMES[i] ?? `${r} piksel damla`;
    const dot = SIZE_DOTS[i] ?? SIZE_DOTS[SIZE_DOTS.length - 1];
    b.type = 'button';
    b.dataset.r = String(r);
    b.title = name;
    b.setAttribute('aria-label', name);
    b.setAttribute('aria-pressed', 'false');
    const span = document.createElement('span');
    span.className = 'dot';
    span.style.width = span.style.height = `${dot}px`;
    b.append(span);
    b.addEventListener('click', () => handlers.onSize(r));
    sizeGroup.append(b);
  });

  return {
    setTool(tool) {
      press(tools, (b) => b.dataset.tool === tool);
    },
    setSize(r) {
      press(sizeGroup, (b) => b.dataset.r === String(r));
    },
    setAutoCycle(on) {
      auto.setAttribute('aria-pressed', String(on));
    },
    setPalette(palette, colorIndex) {
      swatches.replaceChildren(
        ...palette.colors.map((c, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sw';
          b.style.background = c;
          b.title = c;
          b.setAttribute('aria-label', `${i + 1}. renk (${c})`);
          b.setAttribute('aria-pressed', String(i === colorIndex));
          b.addEventListener('click', () => handlers.onColor(i));
          return b;
        }),
      );
      paletteName.textContent = palette.name;
      paletteButton.setAttribute('aria-label', `Palet: ${palette.name}. Sıradaki palete geç`);
    },
  };
}
