import React from 'react';
import { useTheme, LogoStyle } from '../context/ThemeContext';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'full' | 'icon' | 'badge';
  overrideStyle?: LogoStyle;
  customTitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  variant = 'full',
  overrideStyle,
  customTitle,
}) => {
  const { logoStyle: contextLogoStyle, accentPreset, brandName } = useTheme();
  const activeStyle = overrideStyle || contextLogoStyle;

  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    xs: 'text-xs font-black tracking-tight',
    sm: 'text-sm font-black tracking-tight',
    md: 'text-base sm:text-lg font-black tracking-tight',
    lg: 'text-xl sm:text-2xl font-black tracking-tight',
    xl: 'text-3xl sm:text-4xl font-black tracking-tight',
  };

  const subSizes = {
    xs: 'text-[8px] font-semibold tracking-wider',
    sm: 'text-[9px] font-semibold tracking-wider',
    md: 'text-[10px] font-semibold tracking-wider',
    lg: 'text-xs font-semibold tracking-wider',
    xl: 'text-sm font-semibold tracking-wider',
  };

  // Color mapping based on accent preset
  const primaryColor = accentPreset.colorHex;
  const secondaryColor = accentPreset.secondaryHex;

  // Render SVG Emblem based on selected Logo Style
  const renderEmblem = () => {
    switch (activeStyle) {
      case 'apex-velocity':
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
            {/* Speed backdrop lines */}
            <line x1="4" y1="18" x2="10" y2="18" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
            <line x1="2" y1="24" x2="8" y2="24" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
            
            {/* Dual Kinetic Chevrons */}
            <path
              d="M10 8L18 18L10 28"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 8L26 18L18 28"
              stroke={`url(#logo-grad-${activeStyle})`}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Precision Center Compass Core */}
            <circle cx="18" cy="18" r="2.5" fill={primaryColor} />
            <circle cx="28" cy="18" r="2" fill="#10b981" />
            
            <defs>
              <linearGradient id={`logo-grad-${activeStyle}`} x1="18" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor={primaryColor} />
                <stop offset="1" stopColor={secondaryColor} />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'orbit-beacon':
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
            {/* Hexagonal Radar Container */}
            <polygon
              points="18,4 30,11 30,25 18,32 6,25 6,11"
              stroke="#ffffff"
              strokeWidth="1.8"
              fill="#090d16"
              strokeOpacity="0.8"
            />
            {/* Concentric Telemetry Radio Waves */}
            <circle cx="18" cy="18" r="9" stroke={primaryColor} strokeWidth="1.2" strokeDasharray="3 3" />
            <circle cx="18" cy="18" r="5" stroke={secondaryColor} strokeWidth="1.5" />
            
            {/* High-Tech Transponder Core */}
            <circle cx="18" cy="18" r="2.8" fill={`url(#logo-grad-${activeStyle})`} />
            <line x1="18" y1="4" x2="18" y2="10" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="26" x2="18" y2="32" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />

            <defs>
              <linearGradient id={`logo-grad-${activeStyle}`} x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor={primaryColor} />
                <stop offset="1" stopColor={secondaryColor} />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'shield-transit':
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
            {/* Collegiate Crest Contour */}
            <path
              d="M18 4L30 8V18C30 26 24 31 18 33C12 31 6 26 6 18V8L18 4Z"
              stroke="#ffffff"
              strokeWidth="1.8"
              fill="#090d16"
            />
            {/* Dynamic Transit Wing Geometry */}
            <path
              d="M11 16L18 12L25 16L18 20L11 16Z"
              fill={`url(#logo-grad-${activeStyle})`}
            />
            <path
              d="M13 21L18 18L23 21L18 24L13 21Z"
              fill="#ffffff"
              fillOpacity="0.9"
            />
            <circle cx="18" cy="27" r="1.5" fill={primaryColor} />

            <defs>
              <linearGradient id={`logo-grad-${activeStyle}`} x1="11" y1="12" x2="25" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor={primaryColor} />
                <stop offset="1" stopColor={secondaryColor} />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'aero-pulse':
      default:
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10">
            {/* Speed Waves / Route Corridor */}
            <path
              d="M4 25C8 23 12 23 16 23C21 23 25 27 32 25"
              stroke={`url(#logo-accent-corridor)`}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M6 28.5C10 27 14 27 18 27C22 27 26 30 32 28.5"
              stroke={`url(#logo-accent-corridor)`}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />

            {/* Aerodynamic Shuttle Visor Capsule */}
            <rect
              x="6"
              y="9"
              width="21"
              height="12"
              rx="4.5"
              fill={`url(#logo-body-grad)`}
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* Windshield Cockpit Visor */}
            <path
              d="M19 11.5H24.5C25.6 11.5 26.5 12.4 26.5 13.5V15.5H19V11.5Z"
              fill="#090d16"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <rect x="9" y="11.5" width="7.5" height="4.5" rx="1.5" fill="#090d16" />

            {/* Wheels / Nodes */}
            <circle cx="11.5" cy="21" r="2.2" fill="#090d16" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx="11.5" cy="21" r="0.8" fill={primaryColor} />

            <circle cx="21.5" cy="21" r="2.2" fill="#090d16" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx="21.5" cy="21" r="0.8" fill={primaryColor} />

            {/* Active GPS Satellite Telemetry Beacon */}
            <circle cx="26" cy="8" r="2.2" fill="#10b981" />
            <circle cx="26" cy="8" r="4" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.7" className="animate-ping" />

            <defs>
              <linearGradient id="logo-body-grad" x1="6" y1="9" x2="27" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor={primaryColor} />
                <stop offset="1" stopColor={secondaryColor} />
              </linearGradient>
              <linearGradient id="logo-accent-corridor" x1="4" y1="23" x2="32" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.5" stopColor={primaryColor} />
                <stop offset="1" stopColor={secondaryColor} />
              </linearGradient>
            </defs>
          </svg>
        );
    }
  };

  // Brand Name breakdown
  const title = customTitle || brandName;
  const words = title.split(' ');
  const firstWord = words[0] || 'SmartBus';
  const secondWord = words.slice(1).join(' ') || 'Pulse';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic Emblem Capsule with Ambient Glow */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 group`}>
        {/* Ambient Glow */}
        <div
          className="absolute -inset-0.5 rounded-2xl opacity-75 blur-xs group-hover:opacity-100 transition-opacity"
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        />

        {/* Emblem Shield Surface */}
        <div className="relative w-full h-full rounded-2xl bg-slate-950 border border-white/20 p-1 flex items-center justify-center overflow-hidden shadow-lg shadow-black/30">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:6px_6px] pointer-events-none" />

          {/* SVG Vector */}
          {renderEmblem()}
        </div>
      </div>

      {/* Typography Wordmark (when variant is full) */}
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${titleSizes[size]} text-slate-900 dark:text-white`}>
              {firstWord}
              <span
                className="ml-0.5 font-black text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {secondWord}
              </span>
            </span>

            <span
              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
                borderColor: `${primaryColor}30`,
              }}
            >
              LIVE
            </span>
          </div>

          {showSubtitle && (
            <span className={`${subSizes[size]} text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5`}>
              Campus Transit OS
            </span>
          )}
        </div>
      )}

      {/* Minimal Badge Variant */}
      {variant === 'badge' && (
        <span
          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border"
          style={{
            backgroundColor: `${primaryColor}15`,
            color: primaryColor,
            borderColor: `${primaryColor}30`,
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
};
