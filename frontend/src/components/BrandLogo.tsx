'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  versionBadge?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = true,
  versionBadge,
  className = '',
}) => {
  const boxStyles =
    size === 'sm'
      ? 'w-7 h-7 rounded-md text-xs'
      : size === 'lg'
      ? 'w-10 h-10 rounded-xl text-lg'
      : 'w-8 h-8 rounded-lg text-sm';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 
        EchoLet Brand Mark:
        Solid Google-style blue (#1a73e8) rounded square with bold, pure white capital 'E'.
        Consistent across light/dark themes and all screen sizes.
      */}
      <div
        className={`${boxStyles} flex items-center justify-center shrink-0 shadow-xs font-bold text-white select-none transition-transform`}
        style={{ backgroundColor: '#1a73e8' }}
        aria-label="EchoLet logo"
      >
        <span className="font-sans font-bold text-white leading-none tracking-tight">E</span>
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-semibold text-foreground text-sm tracking-tight">
              EchoLet
            </span>
            {versionBadge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-muted text-muted-foreground border border-border">
                {versionBadge}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground leading-none font-medium mt-1">
            Reliable Outbox Engine
          </span>
        </div>
      )}
    </div>
  );
};
