import React from 'react';
import {
  Zap,
  Droplets,
  BatteryCharging,
  Layers,
  Cpu,
  Check,
  Sliders,
  Sparkles,
  ShieldCheck,
  Waves,
  Eye,
  MoveHorizontal,
  Activity,
} from 'lucide-react';
import {
  UiThemeConfig,
  AnimationEngineMode,
  BlurBudgetOption,
  AnimationSpeedOption,
  ExpansionPatternOption,
  LiquidGlassMode,
  LiquidRefractionIntensity,
  EdgeStretchOption,
  GlassDepthProfile,
  GlassClarityOption,
  saveThemeConfig,
} from '../services/themeStore';

interface AnimationPerformanceSettingsProps {
  themeConfig: UiThemeConfig;
  onThemeChanged: (newConfig: UiThemeConfig) => void;
  showToast?: (message: string) => void;
}

export const AnimationPerformanceSettings: React.FC<AnimationPerformanceSettingsProps> = ({
  themeConfig,
  onThemeChanged,
  showToast,
}) => {
  const currentEngine: AnimationEngineMode = themeConfig.animationEngine || 'fluid';
  const currentBlurBudget: BlurBudgetOption = themeConfig.blurBudget || (currentEngine === 'compositor' ? 'optimized' : 'rich');
  const currentSpeed: AnimationSpeedOption = themeConfig.animationSpeed || (currentEngine === 'compositor' ? 'snappy' : 'fluid');
  const currentExpansion: ExpansionPatternOption = themeConfig.expansionPattern || (currentEngine === 'compositor' ? 'scaleOrigin' : 'flip');
  const containmentEnabled = themeConfig.enableContainment ?? true;

  // Optical Liquid Glass State
  const currentLiquidMode: LiquidGlassMode = themeConfig.liquidGlassMode || 'crystal';
  const currentIntensity: LiquidRefractionIntensity = themeConfig.refractionIntensity || 'subtle';
  const currentEdgeStretch: EdgeStretchOption = themeConfig.edgeStretch || 'subtle';
  const currentDepthProfile: GlassDepthProfile = themeConfig.glassDepthProfile || 'realistic3D';
  const currentGlassBlur: number = typeof themeConfig.glassBlur === 'number' ? themeConfig.glassBlur : 1;
  const currentGlassClarity: GlassClarityOption = themeConfig.glassClarity || 'crystalClear';
  const currentGlassWhiteWash: number = typeof themeConfig.glassWhiteWash === 'number' ? themeConfig.glassWhiteWash : 0;

  const handleUpdateGlassBlur = (blur: number) => {
    const clamped = Math.max(0, Math.min(32, Math.round(blur)));
    const updated: UiThemeConfig = {
      ...themeConfig,
      glassBlur: clamped,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Glass Blur: ${clamped}px`);
  };

  const handleUpdateGlassClarity = (clarity: GlassClarityOption) => {
    const whiteWashMap: Record<GlassClarityOption, number> = {
      crystalClear: 0,
      natural: 3.5,
      subtleWash: 7,
      milkyFrosted: 14,
    };
    const updated: UiThemeConfig = {
      ...themeConfig,
      glassClarity: clarity,
      glassWhiteWash: whiteWashMap[clarity],
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const labels: Record<GlassClarityOption, string> = {
      crystalClear: 'Pure Crystal Glass (0% white body)',
      natural: 'Natural Glass (3.5% white body)',
      subtleWash: 'Light Glaze (7% white body)',
      milkyFrosted: 'Milky Frosted (14% white body)',
    };
    if (showToast) showToast(`Glass Clarity: ${labels[clarity]}`);
  };

  const handleUpdateGlassWhiteWash = (wash: number) => {
    const clamped = Math.max(0, Math.min(25, Number(wash.toFixed(1))));
    let derivedClarity: GlassClarityOption = 'crystalClear';
    if (clamped <= 1) derivedClarity = 'crystalClear';
    else if (clamped <= 5) derivedClarity = 'natural';
    else if (clamped <= 9) derivedClarity = 'subtleWash';
    else derivedClarity = 'milkyFrosted';

    const updated: UiThemeConfig = {
      ...themeConfig,
      glassWhiteWash: clamped,
      glassClarity: derivedClarity,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Glass White Wash: ${clamped}%`);
  };

  const handleUpdateLiquidMode = (mode: LiquidGlassMode) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      liquidGlassMode: mode,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const labels: Record<LiquidGlassMode, string> = {
      crystal: 'Clear Crystal Refraction',
      blur: 'Standard CSS Blur-md',
      opaque: 'Solid Plain Opaque',
      frosted: 'Frosted Glass Refraction',
      darkSmoke: 'Dark Obsidian Smoke',
      off: 'Flat Blur (Refraction Off)',
    };
    if (showToast) showToast(`Liquid Glass: ${labels[mode]}`);
  };

  const handleUpdateIntensity = (intensity: LiquidRefractionIntensity) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      refractionIntensity: intensity,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const labels: Record<LiquidRefractionIntensity, string> = {
      subtle: 'Subtle Warp (10–12px)',
      medium: 'Medium Warp (18–20px)',
      bold: 'Bold Warp (28–32px)',
    };
    if (showToast) showToast(`Intensity: ${labels[intensity]}`);
  };

  const handleUpdateEdgeStretch = (stretch: EdgeStretchOption) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      edgeStretch: stretch,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const labels: Record<EdgeStretchOption, string> = {
      subtle: 'Subtle Bevel Meniscus',
      bold: 'Bold Deep Meniscus',
      hyper: 'Hyper-Meniscus Warp',
      off: 'Flat Isotropic (Off)',
    };
    if (showToast) showToast(`Edge Stretch: ${labels[stretch]}`);
  };

  const handleUpdateDepthProfile = (profile: GlassDepthProfile) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      glassDepthProfile: profile,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    const labels: Record<GlassDepthProfile, string> = {
      realistic3D: 'Realistic 3D Volumetric Curvature',
      subtleBevel: 'Subtle Bevel Rim',
      minimalist: 'Minimalist Flat',
    };
    if (showToast) showToast(`3D Nav Depth: ${labels[profile]}`);
  };

  const handleSelectEngine = (engine: AnimationEngineMode) => {
    let newBlur: BlurBudgetOption = currentBlurBudget;
    let newSpeed: AnimationSpeedOption = currentSpeed;
    let newExpansion: ExpansionPatternOption = currentExpansion;

    if (engine === 'compositor') {
      newBlur = 'optimized';
      newSpeed = 'snappy';
      newExpansion = 'scaleOrigin';
    } else if (engine === 'reduced') {
      newBlur = 'solid';
      newSpeed = 'instant';
      newExpansion = 'scaleOrigin';
    } else {
      newBlur = 'rich';
      newSpeed = 'fluid';
      newExpansion = 'flip';
    }

    const updated: UiThemeConfig = {
      ...themeConfig,
      animationEngine: engine,
      blurBudget: newBlur,
      animationSpeed: newSpeed,
      expansionPattern: newExpansion,
      enableContainment: true,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);

    const name =
      engine === 'compositor'
        ? 'Compositor Optimized'
        : engine === 'reduced'
        ? 'Minimal Motion'
        : 'Fluid Organic';
    if (showToast) showToast(`Animation Engine: ${name}`);
  };

  const handleUpdateBlurBudget = (blur: BlurBudgetOption) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      blurBudget: blur,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Blur Budget: ${blur === 'optimized' ? 'Optimized (4–8px)' : blur === 'solid' ? 'Solid 0px' : 'Rich (20px)'}`);
  };

  const handleUpdateSpeed = (speed: AnimationSpeedOption) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      animationSpeed: speed,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Speed: ${speed === 'snappy' ? 'Snappy Compositor (220ms)' : speed === 'instant' ? 'Instantaneous (40ms)' : 'Premium (300ms)'}`);
  };

  const handleUpdateExpansion = (pattern: ExpansionPatternOption) => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      expansionPattern: pattern,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`Expansion Pattern: ${pattern === 'scaleOrigin' ? 'GPU Scale-Origin' : 'Fluid Layout Flip'}`);
  };

  const handleToggleContainment = () => {
    const updated: UiThemeConfig = {
      ...themeConfig,
      enableContainment: !containmentEnabled,
    };
    onThemeChanged(updated);
    saveThemeConfig(updated);
    if (showToast) showToast(`CSS Containment: ${!containmentEnabled ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Animation & Performance Architecture
        </h4>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shrink-0">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>{currentEngine === 'compositor' ? 'GPU Composited' : currentEngine === 'reduced' ? 'Battery Saver' : 'Fluid Organic'}</span>
        </span>
      </div>

      {/* Primary Engine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* OPTION 1: FLUID ORGANIC */}
        <button
          type="button"
          onClick={() => handleSelectEngine('fluid')}
          className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between border cursor-pointer ${
            currentEngine === 'fluid'
              ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_4px_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400/40'
              : 'bg-neutral-900/40 hover:bg-neutral-900/70 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Fluid Organic</span>
            </div>
            {currentEngine === 'fluid' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
          </div>
        </button>

        {/* OPTION 2: COMPOSITOR GPU */}
        <button
          type="button"
          onClick={() => handleSelectEngine('compositor')}
          className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between border cursor-pointer ${
            currentEngine === 'compositor'
              ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_4px_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400/40'
              : 'bg-neutral-900/40 hover:bg-neutral-900/70 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Compositor GPU</span>
            </div>
            {currentEngine === 'compositor' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
          </div>
        </button>

        {/* OPTION 3: BATTERY SAVER */}
        <button
          type="button"
          onClick={() => handleSelectEngine('reduced')}
          className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between border cursor-pointer ${
            currentEngine === 'reduced'
              ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_4px_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400/40'
              : 'bg-neutral-900/40 hover:bg-neutral-900/70 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Battery Saver</span>
            </div>
            {currentEngine === 'reduced' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
          </div>
        </button>
      </div>

      {/* ================= OPTICAL LIQUID GLASS REFRACTION ================= */}
      <div className="rounded-3xl bg-neutral-900/50 backdrop-blur-2xl border border-white/10 p-4 sm:p-5 space-y-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-white tracking-wide">
              Liquid Glass Optical Refraction
            </h5>
          </div>

          <div className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 shrink-0">
            Mode: <span className="font-bold capitalize">{currentLiquidMode}</span>
          </div>
        </div>

        {/* 4 Optical Refraction Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          {/* 1. Crystal Lens */}
          <button
            type="button"
            onClick={() => handleUpdateLiquidMode('crystal')}
            className={`p-2.5 rounded-xl text-left transition-all border relative flex items-center justify-between cursor-pointer ${
              currentLiquidMode === 'crystal'
                ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_4px_16px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>💎 Crystal</span>
              {currentLiquidMode === 'crystal' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-cyan-200">
              {currentGlassBlur}px
            </span>
          </button>

          {/* 2. Frosted Glass */}
          <button
            type="button"
            onClick={() => handleUpdateLiquidMode('frosted')}
            className={`p-2.5 rounded-xl text-left transition-all border relative flex items-center justify-between cursor-pointer ${
              currentLiquidMode === 'frosted'
                ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_4px_16px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🌫️ Frosted</span>
              {currentLiquidMode === 'frosted' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-neutral-300">
              10px
            </span>
          </button>

          {/* 3. Dark Smoke */}
          <button
            type="button"
            onClick={() => handleUpdateLiquidMode('darkSmoke')}
            className={`p-2.5 rounded-xl text-left transition-all border relative flex items-center justify-between cursor-pointer ${
              currentLiquidMode === 'darkSmoke'
                ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_4px_16px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🌑 Smoke</span>
              {currentLiquidMode === 'darkSmoke' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-neutral-400">
              Noir
            </span>
          </button>

          {/* 4. Flat Blur (Off) */}
          <button
            type="button"
            onClick={() => handleUpdateLiquidMode('off')}
            className={`p-2.5 rounded-xl text-left transition-all border relative flex items-center justify-between cursor-pointer ${
              currentLiquidMode === 'off'
                ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_4px_16px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>⚪ Flat (Off)</span>
              {currentLiquidMode === 'off' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-neutral-400">
              No Warp
            </span>
          </button>
        </div>

        {/* 1. Refraction Warp Intensity */}
        {currentLiquidMode !== 'off' && (
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white font-medium">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Refraction Warp Intensity (Displacement Scale)</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
                {currentIntensity === 'subtle' ? '10–12px Scale' : currentIntensity === 'bold' ? '28–32px Scale' : '18–20px Scale'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleUpdateIntensity('subtle')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentIntensity === 'subtle'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Subtle (Gentle Ripple)
              </button>

              <button
                type="button"
                onClick={() => handleUpdateIntensity('medium')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentIntensity === 'medium'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Medium (Natural Lens)
              </button>

              <button
                type="button"
                onClick={() => handleUpdateIntensity('bold')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentIntensity === 'bold'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Bold (Wavy Water)
              </button>
            </div>
          </div>
        )}

        {/* 2. Peripheral Edge Stretch Control */}
        {currentLiquidMode === 'crystal' && (
          <div className="p-3.5 rounded-2xl bg-black/30 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white font-medium">
                <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Peripheral Edge Stretch (Lens Meniscus Elongation)</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
                {currentEdgeStretch === 'hyper'
                  ? 'Hyper-Meniscus Warp'
                  : currentEdgeStretch === 'bold'
                  ? 'Bold (Deep Meniscus)'
                  : currentEdgeStretch === 'subtle'
                  ? 'Subtle (Natural Bevel)'
                  : 'Off (Flat Isotropic)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleUpdateEdgeStretch('subtle')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentEdgeStretch === 'subtle'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Subtle (Natural Bevel)
              </button>

              <button
                type="button"
                onClick={() => handleUpdateEdgeStretch('bold')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentEdgeStretch === 'bold'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Bold (Deep Meniscus)
              </button>

              <button
                type="button"
                onClick={() => handleUpdateEdgeStretch('hyper')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentEdgeStretch === 'hyper'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Hyper-Meniscus Warp
              </button>

              <button
                type="button"
                onClick={() => handleUpdateEdgeStretch('off')}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                  currentEdgeStretch === 'off'
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Off (Flat Isotropic)
              </button>
            </div>
          </div>
        )}

        {/* 3. 3D Volumetric Pill & Nav Depth */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Volumetric Pill & Nav Depth (Real Physical Curvature)</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              {currentDepthProfile === 'realistic3D'
                ? 'Realistic 3D Depth (Active)'
                : currentDepthProfile === 'subtleBevel'
                ? 'Subtle Bevel Rim'
                : 'Minimalist Flat'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleUpdateDepthProfile('realistic3D')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentDepthProfile === 'realistic3D'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Realistic 3D (Curved Pill)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateDepthProfile('subtleBevel')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentDepthProfile === 'subtleBevel'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Subtle Bevel Rim
            </button>

            <button
              type="button"
              onClick={() => handleUpdateDepthProfile('minimalist')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentDepthProfile === 'minimalist'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Minimalist Flat
            </button>
          </div>
        </div>

        {/* 4. Glass Blur Intensity */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-cyan-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>Glass Blur Intensity (Backdrop Diffusion)</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              {currentGlassBlur}px {currentGlassBlur === 0 ? '(Pure Optics)' : currentGlassBlur <= 4 ? '(Crystal Lens)' : currentGlassBlur <= 8 ? '(Soft Glass)' : '(Frosted)'}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>0px (Zero Blur / Pure Optics)</span>
              <span className="text-cyan-300 font-bold">{currentGlassBlur}px</span>
              <span>24px (Heavy Frost)</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={currentGlassBlur}
              onChange={(e) => handleUpdateGlassBlur(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-6 gap-1.5 pt-0.5">
            {[
              { val: 0, label: '0px' },
              { val: 1, label: '1px (Rec)' },
              { val: 3, label: '3px' },
              { val: 6, label: '6px' },
              { val: 12, label: '12px' },
              { val: 20, label: '20px' },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleUpdateGlassBlur(p.val)}
                className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                  currentGlassBlur === p.val
                    ? 'bg-cyan-500 text-neutral-950 font-bold border-cyan-400 shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="text-[11px] font-mono font-bold leading-tight">{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Glass Clarity & Anti-Whitish Fog */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-cyan-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Glass Body Clarity & Tint (Anti-Whitish Fog)</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              {currentGlassWhiteWash}% White Body
            </span>
          </div>

          {/* Clarity Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleUpdateGlassClarity('crystalClear')}
              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                currentGlassClarity === 'crystalClear'
                  ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>💎 Pure Crystal</span>
                {currentGlassClarity === 'crystalClear' && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-[10px] text-cyan-300 font-mono mt-0.5">0% White (No Milk)</div>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateGlassClarity('natural')}
              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                currentGlassClarity === 'natural'
                  ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>🌿 Natural Glass</span>
                {currentGlassClarity === 'natural' && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-[10px] text-neutral-300 font-mono mt-0.5">3.5% White Body</div>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateGlassClarity('subtleWash')}
              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                currentGlassClarity === 'subtleWash'
                  ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>✨ Light Glaze</span>
                {currentGlassClarity === 'subtleWash' && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-[10px] text-neutral-300 font-mono mt-0.5">7% White Body</div>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateGlassClarity('milkyFrosted')}
              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                currentGlassClarity === 'milkyFrosted'
                  ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400/40 text-white shadow-sm'
                  : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>🌫️ Milky Frosted</span>
                {currentGlassClarity === 'milkyFrosted' && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">14% White Body</div>
            </button>
          </div>

          {/* Precision Whiteness Slider */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>0% (100% Clear Crystal)</span>
              <span className="text-cyan-300 font-bold">{currentGlassWhiteWash}% White Opacity</span>
              <span>20% (Chalky Wash)</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={currentGlassWhiteWash}
              onChange={(e) => handleUpdateGlassWhiteWash(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
          </div>
        </div>
      </div>

      {/* ================= FINE-GRAINED PERFORMANCE TUNING ================= */}
      <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* 1. Blur Budget */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Real-Time Blur Radius Budget</span>
            </div>
            <span className="text-xs font-medium text-cyan-300 px-2.5 py-0.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 shrink-0">
              {currentBlurBudget === 'optimized' ? '4–8px (Capped)' : currentBlurBudget === 'solid' ? '0px (Solid)' : 'Rich Glass (20px)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUpdateBlurBudget('rich')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentBlurBudget === 'rich'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Rich Glass (20px)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateBlurBudget('optimized')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentBlurBudget === 'optimized'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Optimized (4–8px)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateBlurBudget('solid')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentBlurBudget === 'solid'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Solid (0px Blur)
            </button>
          </div>
        </div>

        {/* 2. Motion Duration & Curve */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Motion Curves & Timing</span>
            </div>
            <span className="text-xs font-medium text-cyan-300 px-2.5 py-0.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 shrink-0">
              {currentSpeed === 'fluid' ? '300ms Premium' : currentSpeed === 'snappy' ? '220ms Snappy' : '40ms Instant'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUpdateSpeed('fluid')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentSpeed === 'fluid'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Premium (300ms)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateSpeed('snappy')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentSpeed === 'snappy'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Snappy (220ms)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateSpeed('instant')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentSpeed === 'instant'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Instant (40ms)
            </button>
          </div>
        </div>

        {/* 3. Expanding Button / Drawer Technique */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Menu & Modal Expansion Technique</span>
            </div>
            <span className="text-xs font-medium text-cyan-300 px-2.5 py-0.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 shrink-0">
              {currentExpansion === 'scaleOrigin' ? 'GPU Scale-Origin' : 'Layout Flip'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUpdateExpansion('scaleOrigin')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentExpansion === 'scaleOrigin'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Compositor Scale-Origin (GPU)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateExpansion('flip')}
              className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                currentExpansion === 'flip'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
              }`}
            >
              Fluid Layout Flip (Morphing)
            </button>
          </div>
        </div>

        {/* 4. CSS Containment */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">CSS Containment (contain: layout paint)</span>
          </div>
          <button
            type="button"
            onClick={handleToggleContainment}
            className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              containmentEnabled ? 'bg-cyan-500' : 'bg-white/10'
            }`}
            aria-label="Toggle CSS Containment"
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                containmentEnabled ? 'translate-x-6 bg-neutral-950 shadow-sm' : 'translate-x-1 bg-neutral-400'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
