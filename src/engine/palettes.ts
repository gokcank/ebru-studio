import type { Palette } from './types';

// Pigment paletleri. İki temada da aynıdır; temayla değişen yalnız su rengidir.
export const PALETTES: readonly Palette[] = [
  { name: 'Klasik', colors: ['#1d3557', '#8a3324', '#f4ead5', '#c9a227', '#3f5e3a'] },
  { name: 'Çini', colors: ['#1446a0', '#2ab7ca', '#f7f4ec', '#b3001b', '#0f6a53'] },
  { name: 'Gece', colors: ['#0e1b2c', '#c9a227', '#6d597a', '#e8e0cc', '#355070'] },
  { name: 'Gülkurusu', colors: ['#9d6b72', '#e5d0cc', '#54494b', '#c48f8f', '#efe6dd'] },
  { name: 'Zümrüt', colors: ['#0b5d4a', '#d9c9a3', '#163832', '#58a081', '#8a3324'] },
];
