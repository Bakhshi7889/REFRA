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

export type AnimationEngineMode = 'fluid' | 'compositor' | 'reduced';
export type BlurBudgetOption = 'rich' | 'optimized' | 'solid';
export type AnimationSpeedOption = 'fluid' | 'snappy' | 'instant';
export type ExpansionPatternOption = 'flip' | 'scaleOrigin';
export type LiquidGlassMode = 'crystal' | 'blur' | 'opaque' | 'frosted' | 'darkSmoke' | 'off';
export type LiquidRefractionIntensity = 'subtle' | 'medium' | 'bold';
export type EdgeStretchOption = 'subtle' | 'bold' | 'hyper' | 'off';
export type GlassDepthProfile = 'realistic3D' | 'subtleBevel' | 'minimalist';
export type GlassClarityOption = 'crystalClear' | 'natural' | 'subtleWash' | 'milkyFrosted';

export interface UiThemeConfig {
  bgMode: 'color' | 'image';
  selectedBgColor: string;
  customBgImage: string | null;
  customBgImageName: string | null;
  bgOverlayDim: number; // 0 to 80%
  bgBlur: number; // 0 to 40px
  selectedFontId: FontOptionId;
  selectedPaletteId: string | null; // null means standard neutral (no color tint)
  
  // Animation & Compositor Architecture Options
  animationEngine: AnimationEngineMode; // 'fluid' (current default) | 'compositor' (Senior Engineer GPU mode) | 'reduced'
  blurBudget: BlurBudgetOption; // 'rich' (16-24px) | 'optimized' (4-8px + fallback) | 'solid' (0px blur)
  animationSpeed: AnimationSpeedOption; // 'fluid' (420ms) | 'snappy' (220ms bezier) | 'instant'
  expansionPattern: ExpansionPatternOption; // 'flip' (organic dynamic) | 'scaleOrigin' (GPU scale + counter-scale)
  enableContainment: boolean; // CSS contain: layout paint

  // Optical Liquid Glass Refraction Engine
  liquidGlassMode: LiquidGlassMode; // 'crystal' | 'blur' | 'opaque' | 'frosted' | 'darkSmoke' | 'off'
  refractionIntensity: LiquidRefractionIntensity; // 'subtle' | 'medium' | 'bold'
  refractionHeight?: number; // 0 to 50px (exact optical displacement scale, default 40px)
  edgeStretch: EdgeStretchOption; // 'subtle' (natural optical bevel) | 'bold' (deep prism meniscus) | 'hyper' (hyper-meniscus warp) | 'off' (flat isotropic)
  glassDepthProfile: GlassDepthProfile; // 'realistic3D' (convex lens meniscus refraction & optical volume) | 'subtleBevel' | 'minimalist'

  // Glass Blur & Clarity (Anti-Milkiness / Real Crystal Glass)
  glassBlur: number; // 0 to 32px (custom blur in glass, default 1px for liquid optical glass)
  glassClarity: GlassClarityOption; // 'crystalClear' (1.5% white) | 'natural' (3.5%) | 'subtleWash' (7%) | 'milkyFrosted' (14%)
  glassWhiteWash: number; // 0 to 25% white body opacity (default 0% to avoid whitish cloudy fog)

  // Network & Bandwidth Optimization
  dataSaverMode: boolean; // Low-bandwidth optimization: pauses idle cycling, disables trailer autoplay, uses compressed w185/w342 posters, disables aggressive preloading

  // Image Delivery Routing & Resolution Settings
  imageRoutingMode?: 'anime_edge' | 'auto' | 'proxy' | 'direct'; // 'anime_edge' (Anime-style Cloudflare CDN mirror) | 'auto' (failover) | 'proxy' (force server proxy) | 'direct' (TMDB CDN only)
  imageResolutionQuality?: 'auto' | 'ultra' | 'high' | 'balanced' | 'compact';
}

export type ImageRoutingMode = 'anime_edge' | 'auto' | 'proxy' | 'direct';
export type ImageResolutionQuality = 'auto' | 'ultra' | 'high' | 'balanced' | 'compact';

export const DEFAULT_THEME_CONFIG: UiThemeConfig = {
  bgMode: 'image',
  selectedBgColor: '#0c0d12',
  customBgImage: '/wallpapers/b24802b3051859add5e0bcc7b17800e3.webp',
  customBgImageName: 'Chrome Horizon',
  bgOverlayDim: 0,
  bgBlur: 12,
  selectedFontId: 'panchange',
  selectedPaletteId: null, // Neutral default (no color tint)
  animationEngine: 'fluid',
  blurBudget: 'rich',
  animationSpeed: 'fluid',
  expansionPattern: 'flip',
  enableContainment: true,
  liquidGlassMode: 'crystal',
  refractionIntensity: 'subtle',
  refractionHeight: 40,
  edgeStretch: 'subtle',
  glassDepthProfile: 'realistic3D',
  glassBlur: 1,
  glassClarity: 'crystalClear',
  glassWhiteWash: 0,
  dataSaverMode: false,
  imageRoutingMode: 'anime_edge',
  imageResolutionQuality: 'auto',
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
  // Always keep pill background strictly neutral dark smoke - never tinted by palette color
  root.style.setProperty('--glass-pill-bg', 'rgba(16, 18, 24, 0.65)');
  root.style.setProperty('--glass-border', `rgba(255, 255, 255, 0.12)`);
  root.style.setProperty('--glass-border-subtle', `rgba(255, 255, 255, 0.08)`);
  root.style.setProperty('--glass-sheet-bg', `rgba(${Math.max(6, Math.floor(domRgb.r * 0.4))}, ${Math.max(6, Math.floor(domRgb.g * 0.4))}, ${Math.max(8, Math.floor(domRgb.b * 0.4))}, 0.85)`);

  // Set Button & Interaction Tint CSS Variables - strictly preserve neutral white / dark luxury for all buttons
  root.style.setProperty('--btn-primary-bg', '#ffffff');
  root.style.setProperty('--btn-primary-text', '#0a0a0c');
  root.style.setProperty('--btn-secondary-bg', 'rgba(255, 255, 255, 0.08)');
  root.style.setProperty('--btn-secondary-hover', 'rgba(255, 255, 255, 0.16)');
  root.style.setProperty('--btn-secondary-text', '#ffffff');
  root.style.setProperty('--accent-glow', `0 0 24px rgba(255, 255, 255, 0.25)`);
  root.style.setProperty('--badge-bg', `rgba(255, 255, 255, 0.12)`);
  root.style.setProperty('--badge-text', '#ffffff');
  root.style.setProperty('--badge-border', `rgba(255, 255, 255, 0.20)`);

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

  // Apply Animation Engine & Compositor Attributes
  const animEngine: AnimationEngineMode = config.animationEngine || 'fluid';
  const blurBudget: BlurBudgetOption = config.blurBudget || (animEngine === 'compositor' ? 'optimized' : 'rich');
  const animSpeed: AnimationSpeedOption = config.animationSpeed || (animEngine === 'compositor' ? 'snappy' : 'fluid');
  const expansionPattern: ExpansionPatternOption = config.expansionPattern || (animEngine === 'compositor' ? 'scaleOrigin' : 'flip');
  const containment = config.enableContainment ?? true;

  root.setAttribute('data-anim-mode', animEngine);
  root.setAttribute('data-blur-budget', blurBudget);
  root.setAttribute('data-anim-speed', animSpeed);
  root.setAttribute('data-expansion-pattern', expansionPattern);
  root.setAttribute('data-containment', containment ? 'true' : 'false');

  if (animEngine === 'compositor') {
    root.style.setProperty('--anim-timing', 'cubic-bezier(0.25, 0.1, 0.25, 1)'); // Exact smooth curve of the ❌ one
    root.style.setProperty('--anim-duration', animSpeed === 'instant' ? '0.04s' : animSpeed === 'snappy' ? '0.22s' : '0.30s');
  } else if (animEngine === 'reduced') {
    root.style.setProperty('--anim-timing', 'linear');
    root.style.setProperty('--anim-duration', '0.01s');
  } else {
    root.style.setProperty('--anim-timing', 'cubic-bezier(0.25, 0.1, 0.25, 1)');
    root.style.setProperty('--anim-duration', animSpeed === 'instant' ? '0.04s' : animSpeed === 'snappy' ? '0.24s' : '0.30s');
  }

  // Glass Blur Value (Customizable Blur in Glass)
  // If user set an explicit glassBlur, prioritize it; otherwise use blurBudget baseline
  let effectiveGlassBlur = 1;
  if (typeof config.glassBlur === 'number') {
    effectiveGlassBlur = Math.max(0, Math.min(40, config.glassBlur));
  } else if (blurBudget === 'optimized') {
    effectiveGlassBlur = 6;
  } else if (blurBudget === 'solid') {
    effectiveGlassBlur = 0;
  } else {
    effectiveGlassBlur = 1;
  }

  root.style.setProperty('--glass-blur-strength', `${effectiveGlassBlur}px`);
  root.style.setProperty('--glass-blur-mobile', `${Math.max(0, effectiveGlassBlur - 1)}px`);

  // Glass Clarity & Whiteness Wash (Anti-Milkiness / Real Glass Physics)
  // Explaining & solving "why it was whitish instead of glass like":
  // Real physical glass has almost 0% white body fill—its visual presence comes from
  // light refraction, Snell-law bending, specular rim arcs, and caustics.
  // Standard web glassmorphism recipes stack 8-15% white, which when blurred turns
  // into a milky white opaque fog.
  const whiteWashPercent = typeof config.glassWhiteWash === 'number'
    ? Math.max(0, Math.min(25, config.glassWhiteWash))
    : (config.glassClarity === 'crystalClear' ? 1.5 : config.glassClarity === 'natural' ? 3.5 : config.glassClarity === 'milkyFrosted' ? 14 : 7);
  
  const whiteWashAlpha = whiteWashPercent / 100;
  root.style.setProperty('--glass-white-wash', `${whiteWashAlpha.toFixed(4)}`);
  root.style.setProperty('--glass-sheen-top', `${(whiteWashAlpha * 1.5 + 0.03).toFixed(4)}`);
  root.style.setProperty('--glass-border-alpha', `${(Math.min(0.40, whiteWashAlpha * 1.4 + 0.12)).toFixed(4)}`);
  root.style.setProperty('--glass-specular-alpha', `${(Math.min(0.85, 0.45 + whiteWashAlpha * 1.5)).toFixed(4)}`);

  // Optical Liquid Glass Refraction Engine & 3D Depth
  const liquidGlassMode: LiquidGlassMode = config.liquidGlassMode || 'crystal';
  const refractionIntensity: LiquidRefractionIntensity = config.refractionIntensity || 'medium';
  const edgeStretch: EdgeStretchOption = config.edgeStretch || 'subtle';
  const glassDepthProfile: GlassDepthProfile = config.glassDepthProfile || 'realistic3D';
  const refractionHeight = config.refractionHeight ?? 40;

  root.setAttribute('data-liquid-glass', liquidGlassMode);
  root.setAttribute('data-refraction-intensity', refractionIntensity);
  root.setAttribute('data-refraction-height', String(refractionHeight));
  root.setAttribute('data-edge-stretch', edgeStretch);
  root.setAttribute('data-glass-depth', glassDepthProfile);
  root.setAttribute('data-glass-clarity', config.glassClarity || 'crystalClear');

  // Update dynamic displacement filter scale directly
  const dynamicMap = document.getElementById('liquid-glass-dynamic-map');
  if (dynamicMap) {
    dynamicMap.setAttribute('scale', String(refractionHeight));
  }

  if (liquidGlassMode === 'off' || liquidGlassMode === 'blur' || liquidGlassMode === 'opaque') {
    root.style.setProperty('--liquid-filter-url', 'none');
  } else if (refractionHeight === 0) {
    root.style.setProperty('--liquid-filter-url', 'none');
  } else {
    root.style.setProperty('--liquid-filter-url', 'url(#liquid-glass-dynamic)');
  }
}

const THEME_VERSION_KEY = 'refra_theme_ver_v12_liquid_40px_1px_clean';

export async function loadSavedThemeConfig(): Promise<UiThemeConfig> {
  try {
    const isUpgraded = localStorage.getItem(THEME_VERSION_KEY);
    const fromIdb = await getIndexedDbSetting<UiThemeConfig>('ui_theme_config', DEFAULT_THEME_CONFIG);
    const fromLocal = localStorage.getItem('refra_ui_theme_config');
    const raw = fromIdb || (fromLocal ? JSON.parse(fromLocal) : null);

    if (!isUpgraded || !raw) {
      localStorage.setItem(THEME_VERSION_KEY, 'true');
      const base = raw || DEFAULT_THEME_CONFIG;
      const updated: UiThemeConfig = {
        ...DEFAULT_THEME_CONFIG,
        ...base,
        refractionHeight: 40,
        glassBlur: 1,
        liquidGlassMode: 'crystal',
        bgMode: 'image',
        customBgImage: '/wallpapers/b24802b3051859add5e0bcc7b17800e3.webp',
        customBgImageName: 'Chrome Horizon',
      };
      await saveThemeConfig(updated);
      return updated;
    }

    const merged: UiThemeConfig = { ...DEFAULT_THEME_CONFIG, ...raw };
    // Enforce 1px blur and 40px refraction height for liquid crystal glass defaults
    if (merged.liquidGlassMode === 'crystal' || !merged.liquidGlassMode) {
      if (merged.glassBlur === 14 || merged.glassBlur === 3 || typeof merged.glassBlur !== 'number') {
        merged.glassBlur = 1;
      }
      if (merged.refractionHeight === 18 || typeof merged.refractionHeight !== 'number') {
        merged.refractionHeight = 40;
      }
    }
    // Enforce anime_edge routing mode across all devices
    if (
      merged.imageRoutingMode === 'direct' ||
      merged.imageRoutingMode === 'proxy' ||
      merged.imageRoutingMode === 'auto' ||
      !merged.imageRoutingMode
    ) {
      merged.imageRoutingMode = 'anime_edge';
    }
    return merged;
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

/**
 * Detects if the user's OS or browser has requested data saving via Network Information API
 */
export function isSystemSaveDataDetected(): boolean {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    return Boolean(conn && (conn.saveData === true || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g'));
  }
  return false;
}

/**
 * Synchronously checks if Data Saver mode is active (from user preferences or system network constraint)
 */
export function isDataSaverActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('refra_ui_theme_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (typeof cfg.dataSaverMode === 'boolean') {
        return cfg.dataSaverMode;
      }
    }
  } catch {
    // Ignore JSON errors
  }
  return isSystemSaveDataDetected();
}

/**
 * Toggles or explicitly sets Data Saver mode
 */
export async function setDataSaverMode(enabled: boolean): Promise<UiThemeConfig> {
  const current = await loadSavedThemeConfig();
  const updated: UiThemeConfig = {
    ...current,
    dataSaverMode: enabled,
  };
  await saveThemeConfig(updated);
  return updated;
}

/**
 * Gets the current image routing mode ('anime_edge' | 'auto' | 'proxy' | 'direct')
 */
export function getImageRoutingMode(): ImageRoutingMode {
  if (typeof window === 'undefined') return 'anime_edge';
  try {
    const raw = localStorage.getItem('refra_ui_theme_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.imageRoutingMode) {
        if (
          cfg.imageRoutingMode === 'direct' ||
          cfg.imageRoutingMode === 'proxy' ||
          cfg.imageRoutingMode === 'auto'
        ) {
          return 'anime_edge';
        }
        return cfg.imageRoutingMode;
      }
    }
  } catch {}
  return 'anime_edge';
}

/**
 * Sets the image delivery routing mode
 */
export async function setImageRoutingMode(mode: ImageRoutingMode): Promise<UiThemeConfig> {
  const current = await loadSavedThemeConfig();
  const updated: UiThemeConfig = {
    ...current,
    imageRoutingMode: mode,
  };
  await saveThemeConfig(updated);
  return updated;
}

/**
 * Gets the current image resolution quality setting
 */
export function getImageResolutionQuality(): ImageResolutionQuality {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem('refra_ui_theme_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.imageResolutionQuality) return cfg.imageResolutionQuality;
    }
  } catch {}
  return 'auto';
}

/**
 * Sets the image resolution quality
 */
export async function setImageResolutionQuality(quality: ImageResolutionQuality): Promise<UiThemeConfig> {
  const current = await loadSavedThemeConfig();
  const updated: UiThemeConfig = {
    ...current,
    imageResolutionQuality: quality,
  };
  await saveThemeConfig(updated);
  return updated;
}


