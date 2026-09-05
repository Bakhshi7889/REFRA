import React, { useState, useRef } from 'react';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  Upload,
  Trash2,
  Sparkles,
  SunMedium,
  CheckCircle2,
  RefreshCcw,
  Droplets,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UiThemeConfig,
  FONT_OPTIONS,
  BACKGROUND_COLOR_OPTIONS,
  LUXURY_PALETTES,
  FontOptionId,
  saveThemeConfig,
} from '../services/themeStore';
import { PRESET_WALLPAPERS, PresetWallpaper } from '../data/wallpapers';

interface ThemeSettingsSectionProps {
  themeConfig: UiThemeConfig;
  onThemeChanged: (newConfig: UiThemeConfig) => void;
  showToast?: (message: string) => void;
}

export const ThemeSettingsSection: React.FC<ThemeSettingsSectionProps> = ({
  themeConfig,
  onThemeChanged,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'background' | 'fonts' | 'palettes'>('background');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Background Color selection
  const handleSelectBgColor = (hex: string) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgMode: 'color',
      selectedBgColor: hex,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Canvas set to ${hex}`);
  };

  // Switch to custom image mode
  const handleSwitchToImageMode = () => {
    if (!themeConfig.customBgImage) {
      fileInputRef.current?.click();
      return;
    }
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgMode: 'image',
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast('Switched to custom wallpaper');
  };

  // Upload image handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated: UiThemeConfig = {
        ...themeConfig,
        bgMode: 'image',
        customBgImage: dataUrl,
        customBgImageName: file.name,
      };
      onThemeChanged(updated);
      saveThemeConfig(updated);
      if (showToast) showToast(`Wallpaper saved: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Remove custom background image
  const handleRemoveCustomImage = () => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgMode: 'color',
      customBgImage: null,
      customBgImageName: null,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast('Wallpaper cleared');
  };

  // Change Dimming overlay
  const handleDimChange = (dim: number) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgOverlayDim: dim,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
  };

  // Change Blur overlay
  const handleBlurChange = (blur: number) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgBlur: blur,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
  };

  // Reset Dim & Blur dials to default
  const handleResetDials = () => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgOverlayDim: 40,
      bgBlur: 0,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast('Reset dials: 40% dim, 0px blur');
  };

  // Select Preset 9:16 Wallpaper
  const handleSelectPresetWallpaper = (wp: PresetWallpaper) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      bgMode: 'image',
      customBgImage: wp.url,
      customBgImageName: `${wp.name} (9:16)`,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Applied ${wp.name} wallpaper`);
  };

  // Select Font
  const handleSelectFont = (fontId: FontOptionId) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      selectedFontId: fontId,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const font = FONT_OPTIONS.find((f) => f.id === fontId);
    if (showToast) showToast(`Font set to ${font?.name}`);
  };

  // Select Palette
  const handleSelectPalette = (paletteId: string | null) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      selectedPaletteId: paletteId,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const palette = LUXURY_PALETTES.find((p) => p.id === paletteId);
    if (showToast) {
      showToast(palette ? `Applied ${palette.name}` : 'Reset to Minimalist Neutral');
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input for Custom Background Image */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Apple-style Group Section Header */}
      <div className="flex items-center justify-between px-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Aesthetics & Visual Identity
        </h4>
        <span className="text-[10px] text-neutral-400 font-medium">Real-Time Reactive</span>
      </div>

      {/* Apple iOS-Style Segmented Picker */}
      <div className="p-1 rounded-2xl liquid-glass flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('background')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'background'
              ? 'text-[var(--btn-primary-text)] shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {activeSubTab === 'background' && (
            <motion.div
              layoutId="themeSubTabIndicator"
              className="absolute inset-0 bg-[var(--btn-primary-bg)] rounded-xl"
              transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Canvas</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('fonts')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'fonts'
              ? 'text-[var(--btn-primary-text)] shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {activeSubTab === 'fonts' && (
            <motion.div
              layoutId="themeSubTabIndicator"
              className="absolute inset-0 bg-[var(--btn-primary-bg)] rounded-xl"
              transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>Typography</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('palettes')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'palettes'
              ? 'text-[var(--btn-primary-text)] shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {activeSubTab === 'palettes' && (
            <motion.div
              layoutId="themeSubTabIndicator"
              className="absolute inset-0 bg-[var(--btn-primary-bg)] rounded-xl"
              transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>15 Palettes</span>
          </span>
        </button>
      </div>

      {/* ================= TAB 1: BACKGROUND CANVAS & 9:16 WALLPAPERS ================= */}
      {activeSubTab === 'background' && (
        <div className="rounded-3xl glass-card-themed p-4 space-y-4">
          {/* Surface Mode Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h5 className="text-xs font-semibold text-white">Canvas Surface</h5>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={handleSwitchToImageMode}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  themeConfig.bgMode === 'image'
                    ? 'btn-theme-primary font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Wallpapers</span>
                {themeConfig.customBgImage && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated: UiThemeConfig = { ...themeConfig, bgMode: 'color' };
                  onThemeChanged(updated);
                  saveThemeConfig(updated);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  themeConfig.bgMode === 'color'
                    ? 'btn-theme-primary font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>OLED Color</span>
              </button>
            </div>
          </div>

          {themeConfig.bgMode === 'image' && (
            <>
              {/* ================= ATMOSPHERIC DIALS (DIM DIAL & BLUR DIAL) ================= */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <h6 className="text-xs font-semibold text-white">Atmospheric Optics Dials</h6>
                  </div>

              {(themeConfig.bgOverlayDim !== 40 || (themeConfig.bgBlur || 0) !== 0) && (
                <button
                  type="button"
                  onClick={handleResetDials}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-medium text-neutral-300 transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset dials to default (40% dim, 0px blur)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Dials</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dial 1: Dim Dial */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dim Dial</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded-md bg-white/10">
                    {themeConfig.bgOverlayDim}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="85"
                  step="5"
                  value={themeConfig.bgOverlayDim}
                  onChange={(e) => handleDimChange(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)] cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />

                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>0% (Raw)</span>
                  <span>40% (Default)</span>
                  <span>85% (OLED)</span>
                </div>

                {/* Quick Presets for Dim */}
                <div className="flex items-center gap-1 pt-1">
                  {[
                    { label: 'Clear', val: 15 },
                    { label: 'Medium', val: 40 },
                    { label: 'Dark', val: 65 },
                    { label: 'Deep', val: 80 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleDimChange(p.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                        themeConfig.bgOverlayDim === p.val
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dial 2: Blur Dial */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>Blur Dial</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded-md bg-white/10">
                    {(themeConfig.bgBlur || 0) === 0 ? '0px (Sharp)' : `${themeConfig.bgBlur}px`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="32"
                  step="1"
                  value={themeConfig.bgBlur || 0}
                  onChange={(e) => handleBlurChange(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)] cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />

                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>0px (Cinema)</span>
                  <span>12px (Diffused)</span>
                  <span>32px (Frost)</span>
                </div>

                {/* Quick Presets for Blur */}
                <div className="flex items-center gap-1 pt-1">
                  {[
                    { label: 'Sharp', val: 0 },
                    { label: 'Soft', val: 6 },
                    { label: 'Diffused', val: 14 },
                    { label: 'Frost', val: 24 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleBlurChange(p.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                        (themeConfig.bgBlur || 0) === p.val
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CURATED WALLPAPERS ================= */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                <span>Curated Wallpapers</span>
              </span>
              <span className="text-[11px] text-neutral-400 truncate max-w-[150px]">
                {themeConfig.customBgImageName || 'Active Wallpaper'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {PRESET_WALLPAPERS.map((wp) => {
                const isSelected =
                  themeConfig.bgMode === 'image' && themeConfig.customBgImage === wp.url;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleSelectPresetWallpaper(wp)}
                    className={`group relative rounded-2xl overflow-hidden aspect-[9/16] border transition-all cursor-pointer text-left focus:outline-none ${
                      isSelected
                        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/50 shadow-xl scale-[1.03]'
                        : 'border-white/10 hover:border-white/30 hover:scale-[1.02] opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Clean Wallpaper Image */}
                    <img
                      src={wp.url}
                      alt={wp.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shadow-md z-10">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= CUSTOM WALLPAPER UPLOAD & ACTIVE PREVIEW ================= */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h6 className="text-xs font-semibold text-white">Custom Device Wallpaper</h6>
              </div>

              <div className="flex items-center gap-2">
                {themeConfig.customBgImage && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomImage}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Clear wallpaper"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl btn-theme-secondary text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Active Wallpaper Preview Card */}
            {themeConfig.customBgImage && (
              <div className="relative rounded-2xl overflow-hidden h-24 border border-white/10 group">
                <img
                  src={themeConfig.customBgImage}
                  alt="Active Wallpaper"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/80 text-white flex items-center gap-1 backdrop-blur-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active Wallpaper</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleRemoveCustomImage}
                      className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 transition-colors cursor-pointer backdrop-blur-md"
                      title="Clear wallpaper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="truncate max-w-[220px] text-[11px] font-medium">
                      {themeConfig.customBgImageName || 'Custom Wallpaper'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSwitchToImageMode}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer backdrop-blur-md ${
                        themeConfig.bgMode === 'image'
                          ? 'btn-theme-primary'
                          : 'bg-black/60 text-white hover:bg-black/90'
                      }`}
                    >
                      {themeConfig.bgMode === 'image' ? 'Currently Active' : 'Set Active'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= 15 PRECISION OLED BACKGROUND COLORS (APPEAR WHEN TAPPED OLED COLOR) ================= */}
      {themeConfig.bgMode === 'color' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              15 OLED Canvas Swatches
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              {themeConfig.selectedBgColor}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {BACKGROUND_COLOR_OPTIONS.map((bg) => {
              const isSelected =
                themeConfig.bgMode === 'color' &&
                themeConfig.selectedBgColor.toLowerCase() === bg.hex.toLowerCase();
              return (
                <button
                  key={bg.hex}
                  type="button"
                  onClick={() => handleSelectBgColor(bg.hex)}
                  className={`p-2.5 rounded-2xl border transition-all text-left group relative cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-white/10 shadow-lg scale-[1.02]'
                      : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: bg.hex }}
                    />
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-white truncate">{bg.name}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{bg.hex}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )}

      {/* ================= TAB 2: TYPOGRAPHY (4 FONTS) ================= */}
      {activeSubTab === 'fonts' && (
        <div className="rounded-3xl glass-card-themed p-4 space-y-3.5">
          <h5 className="text-xs font-semibold text-white">Typographic Scale</h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FONT_OPTIONS.map((font, idx) => {
              const isSelected = themeConfig.selectedFontId === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectFont(font.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-white/10 shadow-xl ring-1 ring-[var(--color-accent)]/30'
                      : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{font.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                          #{idx + 1}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{font.category}</span>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Live Rendered Typography Sample */}
                  <div
                    className={`p-2.5 rounded-xl bg-black/40 border border-white/5 text-sm text-neutral-100 font-medium truncate ${font.cssClass}`}
                  >
                    {font.previewSample}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: 15 LUXURY PALETTES (60-30-10 RULE) ================= */}
      {activeSubTab === 'palettes' && (
        <div className="rounded-3xl glass-card-themed p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-semibold text-white">15 Luxury Color Palettes</h5>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold badge-theme">
                60-30-10 Rule
              </span>
            </div>

            {themeConfig.selectedPaletteId && (
              <button
                type="button"
                onClick={() => handleSelectPalette(null)}
                className="px-2.5 py-1 rounded-xl btn-theme-secondary text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>Reset Default</span>
              </button>
            )}
          </div>

          {/* 60-30-10 Visual Guide Graphic */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-300">
              <span>Color Harmony Formula</span>
              <span className="text-[10px] text-neutral-400 font-mono">60% Canvas/Blur • 30% Cards • 10% CTA</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden w-full border border-white/10 shadow-inner">
              <div
                className="w-[60%] relative group flex items-center justify-center text-[7.5px] font-bold text-white transition-colors duration-300"
                style={{ backgroundColor: 'var(--color-dominant)' }}
              >
                60% Dominant
              </div>
              <div
                className="w-[30%] relative group flex items-center justify-center text-[7.5px] font-bold text-white transition-colors duration-300"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                30% Secondary
              </div>
              <div
                className="w-[10%] relative group flex items-center justify-center text-[7.5px] font-bold transition-colors duration-300"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-contrast)',
                }}
              >
                10%
              </div>
            </div>
          </div>

          {/* Palettes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {LUXURY_PALETTES.map((palette) => {
              const isSelected = themeConfig.selectedPaletteId === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handleSelectPalette(palette.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-white/10 shadow-xl ring-1 ring-[var(--color-accent)]/40 scale-[1.01]'
                      : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h6 className="text-xs font-bold text-white">{palette.name}</h6>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* 4 Swatches Card with Exact Hexes */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {palette.swatches.map((swatch) => (
                      <div key={swatch.hex} className="space-y-1">
                        <div
                          className="h-8 rounded-xl border border-white/15 shadow-sm flex items-end justify-center pb-0.5"
                          style={{ backgroundColor: swatch.hex }}
                        >
                          <span className="text-[7px] font-mono font-bold px-1 rounded bg-black/50 text-white">
                            {swatch.role.split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-neutral-300 text-center truncate">
                          {swatch.hex}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
