'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop, Sliders, RefreshCw, Activity } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  systemStatus: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  autoRefresh,
  setAutoRefresh,
  systemStatus,
}) => {
  const { theme, setTheme, brightness, setBrightness } = useTheme();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded border border-border bg-foreground flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-background leading-none">E</span>
            </div>
            <span className="font-semibold tracking-tight text-lg text-foreground">
              EchoLet
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 pl-4 border-l border-border text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono">Transactional Outbox</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Auto Refresh Toggle & Refresh Button */}
          <div className="flex items-center space-x-1.5 border border-border rounded-md px-2 py-1 bg-muted/40 text-xs">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                autoRefresh ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle auto-refresh every 3 seconds"
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Brightness Adjustment Slider */}
          <div className="hidden md:flex items-center space-x-2 border border-border rounded-md px-2.5 py-1 bg-muted/40 text-xs">
            <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">Bright</span>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={brightness}
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
              className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              aria-label="Interface brightness adjustment"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-7">
              {Math.round(brightness * 100)}%
            </span>
          </div>

          {/* Appearance Switcher (Light / Dark / System) */}
          <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded transition-all ${
                theme === 'light'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Light Appearance"
              aria-label="Set light appearance"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded transition-all ${
                theme === 'dark'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Appearance"
              aria-label="Set dark appearance"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded transition-all ${
                theme === 'system'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="System Appearance"
              aria-label="Follow system appearance"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
