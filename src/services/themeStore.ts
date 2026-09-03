import { getIndexedDbSetting, saveIndexedDbSetting } from './indexedDb';

export type FontOptionId = 'panchange' | 'inter' | 'modernist' | 'kola';

export interface FontOption {
  id: FontOptionId;
  name: string;
  cssClass: string;
  fontFamily: string;
  category: string;
  previewSample: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'panchange',
    name: 'ROSNOC Panchange',
    cssClass: 'font-panchange',
    fontFamily: "'Unbounded', 'Syne', 'Plus Jakarta Sans', sans-serif",
    category: 'Wide Geometric Display',
    previewSample: 'CINEMATIC PANCHANGE',
  },
  {
    id: 'inter',
    name: 'BIERIKA Inter',
    cssClass: 'font-inter',
    fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif",
    category: 'Clean Neo-Grotesque',
    previewSample: 'Contemporary Precision UI',
  },
  {
    id: 'modernist',
    name: 'NEOFOLIA SDK-Modernist',
    cssClass: 'font-modernist',
    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    category: 'High-Fashion Modernist Sans',
    previewSample: 'Nordic Avant-Garde Structure',
  },
  {
    id: 'kola',
    name: 'kola regular',
    cssClass: 'font-kola',
    fontFamily: "'Comfortaa', 'Plus Jakarta Sans', cursive, sans-serif",
    category: 'Organic Curved Display',
    previewSample: 'Fluid Organic Typography',
  },
];

export interface BackgroundColorOption {
  hex: string;
  name: string;
  vibe: string;
}

export const BACKGROUND_COLOR_OPTIONS: BackgroundColorOption[] = [
  { hex: '#28282B', name: 'Anthracite', vibe: 'Matte dark stone' },
  { hex: '#0F0B0A', name: 'Dark Espresso', vibe: 'Warm roasted depth' },
  { hex: '#232323', name: 'Jet Carbon', vibe: 'Pure industrial dark' },
  { hex: '#121213', name: 'Obsidian Slate', vibe: 'Balanced deep neutral' },
  { hex: '#1B1813', name: 'Warm Umber', vibe: 'Subtle cinematic earthy' },
  { hex: '#0D0907', name: 'Deep Roast', vibe: 'Midnight chocolate' },
  { hex: '#0C090A', name: 'Vampire Black', vibe: 'Dark velvet red undertone' },
  { hex: '#060606', name: 'Pure Eclipse', vibe: 'Infinite deep space' },
  { hex: '#151922', name: 'Midnight Abyss', vibe: 'Cool Nordic midnight' },
  { hex: '#252321', name: 'Smoked Charcoal', vibe: 'Warm charcoal' },
  { hex: '#4D423E', name: 'Muted Taupe', vibe: 'Soft brushed stone' },
  { hex: '#0B0B0D', name: 'Pitch Slate', vibe: 'True OLED pitch' },
  { hex: '#111111', name: 'Classic Void', vibe: 'Timeless studio black' },
  { hex: '#0A0A0F', name: 'Cosmic Indigo', vibe: 'Deep starfield indigo' },
  { hex: '#08080A', name: 'Onyx Basalt', vibe: 'Subtle dark crystalline' },
];

export interface LuxuryColorSwatch {
  name: string;
  hex: string;
  role: '60% Dominant' | '30% Secondary' | '10% Accent';
}

export interface LuxuryPalette {
  id: string;
  name: string;
  description: string;
  dominantHex: string; // 60%
  secondaryHex: string; // 30%
  secondaryHex2?: string;
  accentHex: string; // 10%
  textAccentHex?: string;
  swatches: LuxuryColorSwatch[];
}

export const LUXURY_PALETTES: LuxuryPalette[] = [
  {
    id: 'black-bean-amber',
    name: 'Black Bean & Cadmium Amber',
    description: 'Rich roasted espresso with vibrant mahogany and gold highlights',
    dominantHex: '#3D1202',
    secondaryHex: '#BA3D03',
    secondaryHex2: '#E58423',
    accentHex: '#E8C581',
    swatches: [
      { name: 'Black Bean (Dominant)', hex: '#3D1202', role: '60% Dominant' },
      { name: 'Mahogany', hex: '#BA3D03', role: '30% Secondary' },
      { name: 'Cadmium Orange', hex: '#E58423', role: '30% Secondary' },
      { name: 'Golf (Crayola)', hex: '#E8C581', role: '10% Accent' },
    ],
  },
  {
    id: 'emerald-sanctuary',
    name: 'Deep Spruce & Forest Laurel',
    description: 'Earthy botanical sanctuary with spruce green and light cream',
    dominantHex: '#0D3A35',
    secondaryHex: '#276152',
    secondaryHex2: '#B1B7AB',
    accentHex: '#FBF6F0',
    swatches: [
      { name: 'Deep Bluish (Dominant)', hex: '#0D3A35', role: '60% Dominant' },
      { name: 'Moderate Green', hex: '#276152', role: '30% Secondary' },
      { name: 'Laurel Green', hex: '#B1B7AB', role: '30% Secondary' },
      { name: 'Light Cream', hex: '#FBF6F0', role: '10% Accent' },
    ],
  },
  {
    id: 'noir-cherry',
    name: 'Noir Velvet & Cherry Crimson',
    description: 'High-contrast luxury drama with noir black, maroon and cotton silk',
    dominantHex: '#1B1716',
    secondaryHex: '#630102',
    secondaryHex2: '#810100',
    accentHex: '#EDEBDE',
    swatches: [
      { name: 'Noir Black (Dominant)', hex: '#1B1716', role: '60% Dominant' },
      { name: 'Maroon', hex: '#630102', role: '30% Secondary' },
      { name: 'Cherry Red', hex: '#810100', role: '30% Secondary' },
      { name: 'Cotton Silk', hex: '#EDEBDE', role: '10% Accent' },
    ],
  },
  {
    id: 'nordic-navy-ochre',
    name: 'Nordic Deep Blue & Pale Ochre',
    description: 'Refined Scandinavian oceanic palette with pale brown and floral white',
    dominantHex: '#182350',
    secondaryHex: '#AFD2FA',
    secondaryHex2: '#B9915E',
    accentHex: '#FEFAEF',
    swatches: [
      { name: 'Deep Blue (Dominant)', hex: '#182350', role: '60% Dominant' },
      { name: 'Powder Blue', hex: '#AFD2FA', role: '30% Secondary' },
      { name: 'Pale Brown', hex: '#B9915E', role: '30% Secondary' },
      { name: 'Floral White', hex: '#FEFAEF', role: '10% Accent' },
    ],
  },
  {
    id: 'gochujang-cosmos',
    name: 'Gochujang Red & Cosmos Night',
    description: 'Dynamic crimson blaze anchored by deep nocturnal cosmos blue',
    dominantHex: '#002F49',
    secondaryHex: '#780001',
    secondaryHex2: '#C1121F',
    accentHex: '#FEF0D5',
    swatches: [
      { name: 'Cosmos Blue (Dominant)', hex: '#002F49', role: '60% Dominant' },
      { name: 'Gochujang Red', hex: '#780001', role: '30% Secondary' },
      { name: 'Crimson Blaze', hex: '#C1121F', role: '30% Secondary' },
      { name: 'Varden Cream', hex: '#FEF0D5', role: '10% Accent' },
    ],
  },
  {
    id: 'royal-amethyst',
    name: 'Royal Amethyst & Midnight Plum',
    description: 'Opulent jewel tones with royal purple, soft violet, and lilac mist',
    dominantHex: '#2E1A47',
    secondaryHex: '#663399',
    secondaryHex2: '#A3779D',
    accentHex: '#E6C7E6',
    swatches: [
      { name: 'Midnight Plum (Dominant)', hex: '#2E1A47', role: '60% Dominant' },
      { name: 'Royal Amethyst', hex: '#663399', role: '30% Secondary' },
      { name: 'Soft Violet', hex: '#A3779D', role: '30% Secondary' },
      { name: 'Lilac Mist', hex: '#E6C7E6', role: '10% Accent' },
    ],
  },
  {
    id: 'verdant-evergreen',
    name: 'Verdant Evergreen & Mint',
    description: 'Lush dark evergreen foliage balanced with emerald green and mint whisper',
    dominantHex: '#013220',
    secondaryHex: '#0B6E4F',
    secondaryHex2: '#50C878',
    accentHex: '#D1F2EB',
    swatches: [
      { name: 'Dark Evergreen (Dominant)', hex: '#013220', role: '60% Dominant' },
      { name: 'Pine Forest', hex: '#0B6E4F', role: '30% Secondary' },
      { name: 'Emerald Green', hex: '#50C878', role: '30% Secondary' },
      { name: 'Mint Whisper', hex: '#D1F2EB', role: '10% Accent' },
    ],
  },
  {
    id: 'ruby-bordeaux',
    name: 'Ruby Red & Deep Bordeaux',
    description: 'Sensual deep wine luxury with crimson silk and soft blush notes',
    dominantHex: '#3F0D12',
    secondaryHex: '#98111E',
    secondaryHex2: '#D72638',
    accentHex: '#FBE4E3',
    swatches: [
      { name: 'Deep Bordeaux (Dominant)', hex: '#3F0D12', role: '60% Dominant' },
      { name: 'Ruby Red', hex: '#98111E', role: '30% Secondary' },
      { name: 'Crimson Silk', hex: '#D72638', role: '30% Secondary' },
      { name: 'Soft Blush', hex: '#FBE4E3', role: '10% Accent' },
    ],
  },
  {
    id: 'sapphire-navy',
    name: 'Sapphire & Deep Arctic Navy',
    description: 'Ultra-luxurious cobalt and navy harmony with ice blue highlights',
    dominantHex: '#000926',
    secondaryHex: '#0F52BA',
    secondaryHex2: '#A6C5D7',
    accentHex: '#D6E6F3',
    swatches: [
      { name: 'Deep Navy (Dominant)', hex: '#000926', role: '60% Dominant' },
      { name: 'Sapphire Cobalt', hex: '#0F52BA', role: '30% Secondary' },
      { name: 'Powder Blue', hex: '#A6C5D7', role: '30% Secondary' },
      { name: 'Ice Blue', hex: '#D6E6F3', role: '10% Accent' },
    ],
  },
  {
    id: 'mahogany-rose-gold',
    name: 'Dark Mahogany & Rose Gold',
    description: 'Earthy mahogany depth accented by muted copper, rose gold and blush pink',
    dominantHex: '#3B1F1B',
    secondaryHex: '#8C4E4F',
    secondaryHex2: '#B66E79',
    accentHex: '#FADADD',
    swatches: [
      { name: 'Dark Mahogany (Dominant)', hex: '#3B1F1B', role: '60% Dominant' },
      { name: 'Muted Copper', hex: '#8C4E4F', role: '30% Secondary' },
      { name: 'Rose Gold', hex: '#B66E79', role: '30% Secondary' },
      { name: 'Blush Pink', hex: '#FADADD', role: '10% Accent' },
    ],
  },
  {
    id: 'bold-energetic',
    name: 'Bold & Energetic Poster',
    description: 'High-energy vivid orange and deep purple grounded in dark slate',
    dominantHex: '#2F3640',
    secondaryHex: '#6C5CE7',
    secondaryHex2: '#55E6C1',
    accentHex: '#FF7675',
    swatches: [
      { name: 'Dark Slate (Dominant)', hex: '#2F3640', role: '60% Dominant' },
      { name: 'Deep Purple', hex: '#6C5CE7', role: '30% Secondary' },
      { name: 'Soft Mint', hex: '#55E6C1', role: '30% Secondary' },
      { name: 'Vivid Orange', hex: '#FF7675', role: '10% Accent' },
    ],
  },
  {
    id: 'earthy-organic',
    name: 'Earthy & Organic Botanicals',
    description: 'Organic forest green and terracotta with soothing warm beige',
    dominantHex: '#2D4F1E',
    secondaryHex: '#4A4A4A',
    secondaryHex2: '#E27D60',
    accentHex: '#F5E6CC',
    swatches: [
      { name: 'Forest Green (Dominant)', hex: '#2D4F1E', role: '60% Dominant' },
      { name: 'Slate Grey', hex: '#4A4A4A', role: '30% Secondary' },
      { name: 'Terracotta', hex: '#E27D60', role: '30% Secondary' },
      { name: 'Warm Beige', hex: '#F5E6CC', role: '10% Accent' },
    ],
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist Luxury',
    description: 'Ultra-clean deep charcoal with soft grey, pure white and gold accent',
    dominantHex: '#2D3436',
    secondaryHex: '#DFE6E9',
    secondaryHex2: '#FFFFFF',
    accentHex: '#C5A059',
    swatches: [
      { name: 'Deep Charcoal (Dominant)', hex: '#2D3436', role: '60% Dominant' },
      { name: 'Soft Grey', hex: '#DFE6E9', role: '30% Secondary' },
      { name: 'Pure White', hex: '#FFFFFF', role: '30% Secondary' },
      { name: 'Accent Gold', hex: '#C5A059', role: '10% Accent' },
    ],
  },
  {
    id: 'high-contrast-tech',
    name: 'High-Contrast Cyber Tech',
    description: 'Futuristic electric blue and cyan neon anchored in night black',
    dominantHex: '#1E272E',
    secondaryHex: '#0984E3',
    secondaryHex2: '#00CEC9',
    accentHex: '#F5F6FA',
    swatches: [
      { name: 'Night Black (Dominant)', hex: '#1E272E', role: '60% Dominant' },
      { name: 'Electric Blue', hex: '#0984E3', role: '30% Secondary' },
      { name: 'Cyan Neon', hex: '#00CEC9', role: '30% Secondary' },
      { name: 'Cloud White', hex: '#F5F6FA', role: '10% Accent' },
    ],
  },
  {
    id: 'luxury-elegant',
    name: 'Luxury & Classical Navy',
    description: 'High-end classical midnight navy with champagne and dusty rose harmony',
    dominantHex: '#192A56',
    secondaryHex: '#F7D794',
    secondaryHex2: '#EDA6A3',
    accentHex: '#FCFBFB',
    swatches: [
      { name: 'Midnight Navy (Dominant)', hex: '#192A56', role: '60% Dominant' },
      { name: 'Champagne', hex: '#F7D794', role: '30% Secondary' },
      { name: 'Dusty Rose', hex: '#EDA6A3', role: '30% Secondary' },
      { name: 'Pearl White', hex: '#FCFBFB', role: '10% Accent' },
    ],
  },
];

export interface UiThemeConfig {
  bgMode: 'color' | 'image';
  selectedBgColor: string;
  customBgImage: string | null;
  customBgImageName: string | null;
  bgOverlayDim: number; // 0 to 80%
  bgBlur: number; // 0 to 40px
  selectedFontId: FontOptionId;
  selectedPaletteId: string | null; // null means standard neutral
}

export const DEFAULT_THEME_CONFIG: UiThemeConfig = {
  bgMode: 'color',
  selectedBgColor: '#08080A',
  customBgImage: null,
  customBgImageName: null,
  bgOverlayDim: 40,
  bgBlur: 0,
  selectedFontId: 'inter',
  selectedPaletteId: null,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = getLuminance(r, g, b);
  return lum > 0.45 ? '#0a0a0c' : '#ffffff';
}

export function applyThemeToDocument(config: UiThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Apply Font
  const font = FONT_OPTIONS.find((f) => f.id === config.selectedFontId) || FONT_OPTIONS[1];
  root.style.setProperty('--font-family-current', font.fontFamily);
  document.body.style.fontFamily = font.fontFamily;

  // Remove any previous font classes from body
  FONT_OPTIONS.forEach((f) => {
    document.body.classList.remove(f.cssClass);
  });
  document.body.classList.add(font.cssClass);

  // Determine Palette Colors (60-30-10)
  let dominantHex = '#14161f';
  let secondaryHex = '#222635';
  let secondaryHex2 = '#2d3345';
  let accentHex = '#ffffff';

  if (config.selectedPaletteId) {
    const palette = LUXURY_PALETTES.find((p) => p.id === config.selectedPaletteId);
    if (palette) {
      dominantHex = palette.dominantHex;
      secondaryHex = palette.secondaryHex;
      secondaryHex2 = palette.secondaryHex2 || palette.secondaryHex;
      accentHex = palette.accentHex;
    }
  }

  // Calculate RGB channels
  const domRgb = hexToRgb(dominantHex);
  const secRgb = hexToRgb(secondaryHex);
  const sec2Rgb = hexToRgb(secondaryHex2);
  const accRgb = hexToRgb(accentHex);

  const contrastText = getContrastTextColor(accentHex);
  const secContrastText = getContrastTextColor(secondaryHex);

  // Set Core Palette CSS Variables
  root.style.setProperty('--color-dominant', dominantHex);
  root.style.setProperty('--dominant-rgb', `${domRgb.r}, ${domRgb.g}, ${domRgb.b}`);
  root.style.setProperty('--color-secondary', secondaryHex);
  root.style.setProperty('--secondary-rgb', `${secRgb.r}, ${secRgb.g}, ${secRgb.b}`);
  root.style.setProperty('--color-secondary-2', secondaryHex2);
  root.style.setProperty('--secondary-2-rgb', `${sec2Rgb.r}, ${sec2Rgb.g}, ${sec2Rgb.b}`);
  root.style.setProperty('--color-accent', accentHex);
  root.style.setProperty('--accent-rgb', `${accRgb.r}, ${accRgb.g}, ${accRgb.b}`);
  root.style.setProperty('--color-accent-contrast', contrastText);

  // Set Liquid Glass & Blur Tint CSS Variables
  root.style.setProperty('--glass-bg', `rgba(${domRgb.r}, ${domRgb.g}, ${domRgb.b}, 0.55)`);
  root.style.setProperty('--glass-bg-elevated', `rgba(${domRgb.r}, ${domRgb.g}, ${domRgb.b}, 0.72)`);
  root.style.setProperty('--glass-subtle-bg', `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.16)`);
  root.style.setProperty('--glass-pill-bg', `rgba(${domRgb.r}, ${domRgb.g}, ${domRgb.b}, 0.58)`);
  root.style.setProperty('--glass-border', `rgba(255, 255, 255, 0.12)`);
  root.style.setProperty('--glass-border-subtle', `rgba(255, 255, 255, 0.08)`);
  root.style.setProperty('--glass-sheet-bg', `rgba(${Math.max(6, Math.floor(domRgb.r * 0.4))}, ${Math.max(6, Math.floor(domRgb.g * 0.4))}, ${Math.max(8, Math.floor(domRgb.b * 0.4))}, 0.85)`);

  // Set Button & Interaction Tint CSS Variables
  root.style.setProperty('--btn-primary-bg', accentHex);
  root.style.setProperty('--btn-primary-text', contrastText);
  root.style.setProperty('--btn-secondary-bg', `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.22)`);
  root.style.setProperty('--btn-secondary-hover', `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.35)`);
  root.style.setProperty('--btn-secondary-text', secContrastText === '#ffffff' ? '#ffffff' : '#f1f2f6');
  root.style.setProperty('--accent-glow', `0 0 24px rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.38)`);
  root.style.setProperty('--badge-bg', `rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.14)`);
  root.style.setProperty('--badge-text', accentHex);
  root.style.setProperty('--badge-border', `rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.25)`);

  // Apply Background
  if (config.bgMode === 'image' && config.customBgImage) {
    document.body.style.backgroundColor = '#060606';
    root.style.setProperty('--app-bg', '#060606');
  } else {
    // If palette is active, blend background with subtle dominant tone if default wasn't customized
    const effectiveBg = config.selectedBgColor;
    document.body.style.backgroundColor = effectiveBg;
    root.style.setProperty('--app-bg', effectiveBg);
  }
}

export async function loadSavedThemeConfig(): Promise<UiThemeConfig> {
  try {
    const fromIdb = await getIndexedDbSetting<UiThemeConfig>('ui_theme_config', DEFAULT_THEME_CONFIG);
    if (fromIdb) return { ...DEFAULT_THEME_CONFIG, ...fromIdb };

    const fromLocal = localStorage.getItem('refra_ui_theme_config') || localStorage.getItem('luma_ui_theme_config');
    if (fromLocal) return { ...DEFAULT_THEME_CONFIG, ...JSON.parse(fromLocal) };
  } catch (err) {
    console.warn('Load theme config notice:', err);
  }
  return DEFAULT_THEME_CONFIG;
}

export async function saveThemeConfig(config: UiThemeConfig): Promise<void> {
  try {
    localStorage.setItem('refra_ui_theme_config', JSON.stringify(config));
    await saveIndexedDbSetting('ui_theme_config', config);
    applyThemeToDocument(config);
  } catch (err) {
    console.warn('Save theme config notice:', err);
  }
}
