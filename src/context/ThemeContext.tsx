import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'midnight';
export type Accent = 'amber' | 'emerald' | 'cobalt' | 'indigo' | 'crimson' | 'obsidian';
export type TemplateStyle = 'command-center' | 'executive-portal' | 'tactical-split';
export type LogoStyle = 'aero-pulse' | 'apex-velocity' | 'orbit-beacon' | 'shield-transit';
export type BrandMoniker = 'SmartBus Pulse' | 'CampusTransit OS' | 'FleetStream' | 'MetroGlide';
export type Density = 'comfortable' | 'compact';

export interface AccentOption {
  id: Accent;
  name: string;
  tagline: string;
  colorHex: string;
  secondaryHex: string;
  gradientClass: string;
  activeBtnClass: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
}

export const ACCENT_PRESETS: AccentOption[] = [
  {
    id: 'amber',
    name: 'Solar Amber',
    tagline: 'Classic Campus Transit & Golden Hour',
    colorHex: '#f59e0b',
    secondaryHex: '#d97706',
    gradientClass: 'from-amber-500 via-amber-600 to-yellow-500',
    activeBtnClass: 'bg-amber-500 text-slate-950 shadow-amber-500/25',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    borderClass: 'border-amber-500/50',
    glowClass: 'shadow-amber-500/20',
  },
  {
    id: 'emerald',
    name: 'Eco Emerald',
    tagline: 'Clean Electric Shuttle & Sustainable Fleet',
    colorHex: '#10b981',
    secondaryHex: '#059669',
    gradientClass: 'from-emerald-500 via-emerald-600 to-teal-400',
    activeBtnClass: 'bg-emerald-500 text-slate-950 shadow-emerald-500/25',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    borderClass: 'border-emerald-500/50',
    glowClass: 'shadow-emerald-500/20',
  },
  {
    id: 'cobalt',
    name: 'Cyber Cobalt',
    tagline: 'High-Tech Telemetry & Electric Velocity',
    colorHex: '#2563eb',
    secondaryHex: '#1d4ed8',
    gradientClass: 'from-blue-600 via-indigo-600 to-cyan-400',
    activeBtnClass: 'bg-blue-600 text-white shadow-blue-500/25',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    borderClass: 'border-blue-500/50',
    glowClass: 'shadow-blue-500/20',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    tagline: 'Prestige University & Academic Transit',
    colorHex: '#6366f1',
    secondaryHex: '#4f46e5',
    gradientClass: 'from-indigo-500 via-purple-600 to-pink-500',
    activeBtnClass: 'bg-indigo-600 text-white shadow-indigo-500/25',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    borderClass: 'border-indigo-500/50',
    glowClass: 'shadow-indigo-500/20',
  },
  {
    id: 'crimson',
    name: 'Crimson Sprint',
    tagline: 'Rapid Metro Express & High Alert',
    colorHex: '#f43f5e',
    secondaryHex: '#e11d48',
    gradientClass: 'from-rose-500 via-red-600 to-orange-400',
    activeBtnClass: 'bg-rose-500 text-white shadow-rose-500/25',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    borderClass: 'border-rose-500/50',
    glowClass: 'shadow-rose-500/20',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Monochrome',
    tagline: 'Ultra-Sharp Architectural Slate & Titanium',
    colorHex: '#38bdf8',
    secondaryHex: '#0284c7',
    gradientClass: 'from-slate-300 via-slate-100 to-slate-400 dark:from-slate-100 dark:via-white dark:to-slate-300',
    activeBtnClass: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-slate-900/25',
    badgeClass: 'bg-slate-500/10 text-slate-800 dark:text-slate-200 border-slate-500/25',
    borderClass: 'border-slate-500/50',
    glowClass: 'shadow-slate-500/20',
  },
];

export interface TemplateOption {
  id: TemplateStyle;
  name: string;
  tagline: string;
  description: string;
  badge: string;
}

export const TEMPLATE_PRESETS: TemplateOption[] = [
  {
    id: 'command-center',
    name: 'Command Center HUD',
    tagline: 'Operations Base Layout',
    description: 'Fixed left navigation rail, tactical breadcrumbs header, and high-density telemetry workspace.',
    badge: 'Operations Standard',
  },
  {
    id: 'executive-portal',
    name: 'Modern Executive Portal',
    tagline: 'Airy Bento Grid Layout',
    description: 'Floating glass header with horizontal category navigation and modular Bento card surfaces.',
    badge: 'Modern Clean',
  },
  {
    id: 'tactical-split',
    name: 'Tactical Dual-Split Console',
    tagline: 'Live Map Split Deck',
    description: 'Persistent live radar map on one side, paired side-by-side with interactive schedules and fleet controls.',
    badge: 'Dispatch Radar',
  },
];

export interface LogoOption {
  id: LogoStyle;
  name: string;
  description: string;
}

export const LOGO_PRESETS: LogoOption[] = [
  {
    id: 'aero-pulse',
    name: 'AeroPulse Visor',
    description: 'Aerodynamic speed shuttle visor with live GPS satellite orbit beacon and motion corridor.',
  },
  {
    id: 'apex-velocity',
    name: 'Apex Velocity Arrow',
    description: 'Dual kinetic forward transit chevrons with high-precision compass bearing center.',
  },
  {
    id: 'orbit-beacon',
    name: 'Orbit Fleet Beacon',
    description: 'Hexagonal transponder node with real-time multi-band radio propagation waves.',
  },
  {
    id: 'shield-transit',
    name: 'Campus Shield Express',
    description: 'Prestige collegiate crest with integrated rapid-transit wing emblem.',
  },
];

interface ThemeContextType {
  // Theme mode
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // Accent
  accent: Accent;
  setAccent: (accent: Accent) => void;
  accentPreset: AccentOption;

  // Template
  template: TemplateStyle;
  setTemplate: (tpl: TemplateStyle) => void;
  templatePreset: TemplateOption;

  // Logo Style
  logoStyle: LogoStyle;
  setLogoStyle: (style: LogoStyle) => void;
  logoPreset: LogoOption;

  // Brand Moniker
  brandName: BrandMoniker;
  setBrandName: (name: BrandMoniker) => void;

  // Density
  density: Density;
  setDensity: (d: Density) => void;

  // Studio modal
  isStudioOpen: boolean;
  openStudio: () => void;
  closeStudio: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_THEME_MODE = 'smartbus_theme_mode_v2';
const STORAGE_ACCENT = 'smartbus_accent_v2';
const STORAGE_TEMPLATE = 'smartbus_template_v2';
const STORAGE_LOGO_STYLE = 'smartbus_logo_style_v2';
const STORAGE_BRAND_NAME = 'smartbus_brand_name_v2';
const STORAGE_DENSITY = 'smartbus_density_v2';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_MODE) as ThemeMode;
    if (saved === 'light' || saved === 'dark' || saved === 'midnight') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [accent, setAccentState] = useState<Accent>(() => {
    const saved = localStorage.getItem(STORAGE_ACCENT) as Accent;
    if (ACCENT_PRESETS.some(a => a.id === saved)) return saved;
    return 'amber';
  });

  const [template, setTemplateState] = useState<TemplateStyle>(() => {
    const saved = localStorage.getItem(STORAGE_TEMPLATE) as TemplateStyle;
    if (TEMPLATE_PRESETS.some(t => t.id === saved)) return saved;
    return 'command-center';
  });

  const [logoStyle, setLogoStyleState] = useState<LogoStyle>(() => {
    const saved = localStorage.getItem(STORAGE_LOGO_STYLE) as LogoStyle;
    if (LOGO_PRESETS.some(l => l.id === saved)) return saved;
    return 'aero-pulse';
  });

  const [brandName, setBrandNameState] = useState<BrandMoniker>(() => {
    const saved = localStorage.getItem(STORAGE_BRAND_NAME) as BrandMoniker;
    if (['SmartBus Pulse', 'CampusTransit OS', 'FleetStream', 'MetroGlide'].includes(saved)) return saved;
    return 'SmartBus Pulse';
  });

  const [density, setDensityState] = useState<Density>(() => {
    const saved = localStorage.getItem(STORAGE_DENSITY) as Density;
    if (saved === 'compact' || saved === 'comfortable') return saved;
    return 'comfortable';
  });

  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // Sync HTML document classes & attributes
  useEffect(() => {
    const root = document.documentElement;

    // Theme mode handling
    root.classList.remove('dark', 'midnight');
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'midnight') {
      root.classList.add('dark', 'midnight');
    }

    root.setAttribute('data-theme-mode', themeMode);
    root.setAttribute('data-accent', accent);
    root.setAttribute('data-template', template);
    root.setAttribute('data-density', density);
    root.setAttribute('data-logo-style', logoStyle);

    // Apply primary color CSS variables
    const activeAccent = ACCENT_PRESETS.find(a => a.id === accent) || ACCENT_PRESETS[0];
    root.style.setProperty('--color-primary', activeAccent.colorHex);
    root.style.setProperty('--color-primary-dark', activeAccent.secondaryHex);

    localStorage.setItem(STORAGE_THEME_MODE, themeMode);
    localStorage.setItem(STORAGE_ACCENT, accent);
    localStorage.setItem(STORAGE_TEMPLATE, template);
    localStorage.setItem(STORAGE_LOGO_STYLE, logoStyle);
    localStorage.setItem(STORAGE_BRAND_NAME, brandName);
    localStorage.setItem(STORAGE_DENSITY, density);
  }, [themeMode, accent, template, logoStyle, brandName, density]);

  const toggleTheme = () => {
    setThemeModeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const setAccent = (newAccent: Accent) => {
    setAccentState(newAccent);
  };

  const setTemplate = (tpl: TemplateStyle) => {
    setTemplateState(tpl);
  };

  const setLogoStyle = (lStyle: LogoStyle) => {
    setLogoStyleState(lStyle);
  };

  const setBrandName = (bName: BrandMoniker) => {
    setBrandNameState(bName);
  };

  const setDensity = (d: Density) => {
    setDensityState(d);
  };

  const accentPreset = ACCENT_PRESETS.find(a => a.id === accent) || ACCENT_PRESETS[0];
  const templatePreset = TEMPLATE_PRESETS.find(t => t.id === template) || TEMPLATE_PRESETS[0];
  const logoPreset = LOGO_PRESETS.find(l => l.id === logoStyle) || LOGO_PRESETS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme: themeMode === 'light' ? 'light' : 'dark',
        themeMode,
        setThemeMode,
        toggleTheme,
        accent,
        setAccent,
        accentPreset,
        template,
        setTemplate,
        templatePreset,
        logoStyle,
        setLogoStyle,
        logoPreset,
        brandName,
        setBrandName,
        density,
        setDensity,
        isStudioOpen,
        openStudio: () => setIsStudioOpen(true),
        closeStudio: () => setIsStudioOpen(false),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
