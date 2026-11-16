import { defineConfig } from 'vitest/config';

// GitHub Pages proje sayfası: gokcank.github.io/ebru-studio/
export default defineConfig({
  base: '/ebru-studio/',
  test: {
    // Yalnız engine test edilir; saf fonksiyonlar, DOM yok.
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // İskelet aşaması: ilk engine testi gelince kaldırılacak.
    passWithNoTests: true,
  },
});
