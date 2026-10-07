import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles, Layout } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  showTemplateBadge?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className = '', showTemplateBadge = true }) => {
  const { themeMode, toggleTheme, openStudio, accentPreset, templatePreset } = useTheme();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Light / Dark quick toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        aria-label="Toggle theme lighting"
      >
        {themeMode === 'light' ? (
          <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
        )}
      </button>

      {/* Theme, Logo & Template Studio Trigger Button */}
      <button
        type="button"
        onClick={openStudio}
        className="px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 group text-xs font-semibold shadow-xs"
        title="Customize Theme, Logo, Palette & Dashboard Template"
        aria-label="Open Theme Studio"
      >
        <Sparkles
          className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform"
          style={{ color: accentPreset.colorHex }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shrink-0"
          style={{ backgroundColor: accentPreset.colorHex }}
        />
        {showTemplateBadge && (
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {templatePreset.name.split(' ')[0]}
          </span>
        )}
      </button>
    </div>
  );
};
