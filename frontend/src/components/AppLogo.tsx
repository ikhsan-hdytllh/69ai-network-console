import React from 'react';
import appLogoImg from '../assets/images/app_logo_icon_1787451240279.jpg';

interface AppLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
    xl: 'w-12 h-12',
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${currentSizeClass} rounded-lg overflow-hidden border border-blue-500/40 shadow-xs bg-slate-900 flex-shrink-0 flex items-center justify-center`}>
        <img
          src={appLogoImg}
          alt="69 AI Network Terminal Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
      {showText && (
        <span className="font-semibold text-slate-100 tracking-tight text-xs sm:text-sm">69 AI</span>
      )}
    </div>
  );
};

export { appLogoImg };
