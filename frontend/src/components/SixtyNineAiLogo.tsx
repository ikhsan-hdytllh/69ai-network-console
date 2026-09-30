import React, { useState } from 'react';
import logoImg from '../assets/images/logo_69_ai_1787451263885.jpg';

interface SixtyNineAiLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showGlow?: boolean;
  withText?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none';
  onClick?: () => void;
}

export const SixtyNineAiLogo: React.FC<SixtyNineAiLogoProps> = ({
  className = '',
  size = 'md',
  showGlow = true,
  withText = false,
  rounded = 'lg',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeDimensions = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
    custom: '',
  }[size];

  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <div 
      className={`inline-flex items-center gap-2 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div 
        className={`relative flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeDimensions} ${roundedClass} ${
          showGlow ? 'shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-cyan-500/40' : 'border border-cyan-800/40'
        } bg-slate-950 transition-all duration-300 hover:shadow-[0_0_18px_rgba(6,182,212,0.6)] hover:border-cyan-400`}
      >
        {!imageError ? (
          <img
            src={logoImg}
            alt="69 AI Logo"
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          // Cyber Circuit High-Fidelity SVG Fallback
          <svg viewBox="0 0 100 100" className="w-full h-full p-0.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="50%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect width="100" height="100" fill="#020617" rx="16" />
            <path d="M20 50 H32 M68 50 H80 M50 20 V30 M50 70 V80" stroke="#00F0FF" strokeWidth="2" strokeOpacity="0.5" />
            <circle cx="32" cy="50" r="2.5" fill="#00F0FF" />
            <circle cx="68" cy="50" r="2.5" fill="#00F0FF" />
            {/* 69 AI stylized text */}
            <text x="50" y="56" textAnchor="middle" fill="url(#cyanGrad)" filter="url(#glow)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="38" letterSpacing="-1">
              69
            </text>
            <text x="50" y="86" textAnchor="middle" fill="#38BDF8" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" letterSpacing="2">
              AI
            </text>
          </svg>
        )}
      </div>

      {withText && (
        <div className="flex flex-col">
          <span className="font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 text-sm leading-tight drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">
            69 AI
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono text-cyan-400/70 font-semibold">
            Network Assistant
          </span>
        </div>
      )}
    </div>
  );
};
