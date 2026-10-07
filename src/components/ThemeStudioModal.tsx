import React from 'react';
import {
  useTheme,
  ACCENT_PRESETS,
  TEMPLATE_PRESETS,
  LOGO_PRESETS,
  ThemeMode,
  Accent,
  TemplateStyle,
  LogoStyle,
  BrandMoniker,
  Density,
} from '../context/ThemeContext';
import { Logo } from './Logo';
import {
  X,
  Palette,
  Layout,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Check,
  Compass,
  Layers,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export const ThemeStudioModal: React.FC = () => {
  const {
    isStudioOpen,
    closeStudio,
    themeMode,
    setThemeMode,
    accent,
    setAccent,
    template,
    setTemplate,
    logoStyle,
    setLogoStyle,
    brandName,
    setBrandName,
    density,
    setDensity,
    accentPreset,
  } = useTheme();

  if (!isStudioOpen) return null;

  const brandOptions: BrandMoniker[] = [
    'SmartBus Pulse',
    'CampusTransit OS',
    'FleetStream',
    'MetroGlide',
  ];

  // Quick Style Presets
  const applyQuickPreset = (presetName: string) => {
    switch (presetName) {
      case 'eco-campus':
        setAccent('emerald');
        setLogoStyle('shield-transit');
        setBrandName('CampusTransit OS');
        setTemplate('command-center');
        setThemeMode('dark');
        break;
      case 'midnight-radar':
        setAccent('cobalt');
        setLogoStyle('orbit-beacon');
        setBrandName('FleetStream');
        setTemplate('tactical-split');
        setThemeMode('midnight');
        break;
      case 'executive-amber':
        setAccent('amber');
        setLogoStyle('aero-pulse');
        setBrandName('SmartBus Pulse');
        setTemplate('executive-portal');
        setThemeMode('dark');
        break;
      case 'crimson-sprint':
        setAccent('crimson');
        setLogoStyle('apex-velocity');
        setBrandName('MetroGlide');
        setTemplate('command-center');
        setThemeMode('dark');
        break;
      case 'obsidian-monochrome':
        setAccent('obsidian');
        setLogoStyle('orbit-beacon');
        setBrandName('CampusTransit OS');
        setTemplate('command-center');
        setThemeMode('midnight');
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{
                backgroundColor: accentPreset.colorHex,
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                Theme, Logo & Template Studio
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${accentPreset.colorHex}15`,
                    color: accentPreset.colorHex,
                    borderColor: `${accentPreset.colorHex}30`,
                  }}
                >
                  Customizer
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize your transit brand emblem, color palette, surface canvas, and dashboard layout architecture.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAccent('amber');
                setLogoStyle('aero-pulse');
                setBrandName('SmartBus Pulse');
                setTemplate('command-center');
                setThemeMode('dark');
                setDensity('comfortable');
              }}
              className="p-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              title="Reset to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={closeStudio}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Preview Strip */}
        <div
          className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: `${accentPreset.colorHex}08`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Preview:</span>
            <Logo size="md" variant="full" />
          </div>

          {/* Quick presets badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
            {[
              { id: 'executive-amber', label: 'Solar Amber' },
              { id: 'eco-campus', label: 'Eco Green' },
              { id: 'midnight-radar', label: 'Cyber Cobalt' },
              { id: 'crimson-sprint', label: 'Crimson Sprint' },
              { id: 'obsidian-monochrome', label: 'Titanium OLED' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyQuickPreset(p.id)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 transition-all shadow-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Logo Style */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-400" />
                <span>1. Transit Brand Logo Style</span>
              </label>
              <span className="text-[11px] text-slate-400">Click to switch primary vector emblem</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {LOGO_PRESETS.map(lp => {
                const isSelected = logoStyle === lp.id;
                return (
                  <button
                    key={lp.id}
                    onClick={() => setLogoStyle(lp.id)}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/80 shadow-md ring-2 ring-offset-1'
                        : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? accentPreset.colorHex : undefined,
                      ...(isSelected ? { ringColor: accentPreset.colorHex } : {}),
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 p-1 flex items-center justify-center border border-white/10 shadow-sm">
                        <Logo size="sm" variant="icon" overrideStyle={lp.id} />
                      </div>
                      {isSelected && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: accentPreset.colorHex }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {lp.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {lp.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Brand Name / Moniker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>2. Brand Title Moniker</span>
              </label>
              <span className="text-[11px] text-slate-400">Choose display name moniker</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {brandOptions.map(name => {
                const isSelected = brandName === name;
                return (
                  <button
                    key={name}
                    onClick={() => setBrandName(name)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accentPreset.colorHex,
                            borderColor: accentPreset.colorHex,
                          }
                        : {}
                    }
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Layout Template Architecture */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layout className="w-4 h-4 text-slate-400" />
                <span>3. Dashboard Layout Template Architecture</span>
              </label>
              <span className="text-[11px] text-slate-400">Transforms app structure & view modes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {TEMPLATE_PRESETS.map(tpl => {
                const isSelected = template === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setTemplate(tpl.id)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/80 shadow-md ring-2 ring-offset-1'
                        : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? accentPreset.colorHex : undefined,
                      ...(isSelected ? { ringColor: accentPreset.colorHex } : {}),
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${accentPreset.colorHex}15`,
                            color: accentPreset.colorHex,
                            borderColor: `${accentPreset.colorHex}30`,
                          }}
                        >
                          {tpl.badge}
                        </span>
                        {isSelected && (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: accentPreset.colorHex }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {tpl.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Miniature Layout wireframe icon */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{tpl.tagline}</span>
                      <span className="font-mono text-[10px]">Active</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Color Palette & Accents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-slate-400" />
                <span>4. Color Accent & Transit Glow Theme</span>
              </label>
              <span className="text-[11px] text-slate-400">Controls buttons, active markers & telemetry</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ACCENT_PRESETS.map(preset => {
                const isSelected = accent === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAccent(preset.id)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800 shadow-md ring-2 ring-offset-1'
                        : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? preset.colorHex : undefined,
                      ...(isSelected ? { ringColor: preset.colorHex } : {}),
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-md relative"
                      style={{
                        background: `radial-gradient(circle, ${preset.colorHex} 0%, ${preset.secondaryHex} 100%)`,
                      }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {preset.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Canvas Surface & Density */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Surface Canvas Mode */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-3">
                5. Canvas Surface Lighting
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'light' as ThemeMode, label: 'Light', icon: Sun, desc: 'Clean White' },
                  { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon, desc: 'Slate-950' },
                  { id: 'midnight' as ThemeMode, label: 'Midnight', icon: Monitor, desc: 'OLED Black' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setThemeMode(item.id)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Density */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-3">
                6. UI Spacing & Information Density
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'comfortable' as Density, label: 'Comfortable', desc: 'Airy margins & large touch targets' },
                  { id: 'compact' as Density, label: 'Compact HUD', desc: 'High-density telemetry & compact grids' },
                ].map(item => {
                  const isSelected = density === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setDensity(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentPreset.colorHex }} />
            <span>Theme auto-persists to browser localStorage</span>
          </div>

          <button
            onClick={closeStudio}
            className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all text-white"
            style={{
              backgroundColor: accentPreset.colorHex,
            }}
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
