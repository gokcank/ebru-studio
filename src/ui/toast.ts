// Kısa bilgi balonu. Öğe `role="status"` taşır; ekran okuyucu metni kendisi duyurur.

/** Balonun ekranda kalma süresi (ms). */
const TOAST_MS = 1800;

export type Toast = (message: string) => void;

export function createToast(el: HTMLElement): Toast {
  let timer: number | undefined;
  return (message) => {
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('show'), TOAST_MS);
  };
}
