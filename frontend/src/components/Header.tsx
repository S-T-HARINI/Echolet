'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Laptop,
  Sliders,
  RefreshCw,
  LayoutDashboard,
  Layers,
  Users,
  Inbox,
  Cpu,
  BookOpen,
} from 'lucide-react';

export type NavigationTab =
  | 'overview'
  | 'workshops'
  | 'registrations'
  | 'outbox'
  | 'simulator'
  | 'architecture';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  systemStatus: string;
  outboxPendingCount?: number;
  simulatorMode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  autoRefresh,
  setAutoRefresh,
  systemStatus,
  outboxPendingCount = 0,
  simulatorMode = 'normal',
}) => {
  const { theme, setTheme, brightness, setBrightness } = useTheme();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
    },
    {
      id: 'workshops',
      label: 'Workshops',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'registrations',
      label: 'Registrations',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'outbox',
      label: 'Transactional Outbox',
      icon: <Inbox className="w-3.5 h-3.5" />,
      badge:
        outboxPendingCount > 0 ? (
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-500 font-medium">
            {outboxPendingCount}
          </span>
        ) : undefined,
    },
    {
      id: 'simulator',
      label: 'Failure Simulator',
      icon: <Cpu className="w-3.5 h-3.5" />,
      badge:
        simulatorMode && simulatorMode !== 'normal' ? (
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-500 font-medium">
            {simulatorMode.toUpperCase()}
          </span>
        ) : undefined,
    },
    {
      id: 'architecture',
      label: 'System Architecture',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-30 transition-colors">
      {/* Top Bar: Brand, Health, Global Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded border border-border bg-foreground flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-background leading-none">E</span>
            </div>
            <span className="font-semibold tracking-tight text-base text-foreground">
              EchoLet
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-border text-xs text-muted-foreground">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                systemStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              } animate-pulse`}
            />
            <span className="font-mono text-[11px]">Transactional Outbox Engine</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Auto Refresh & Manual Refresh */}
          <div className="flex items-center space-x-1 border border-border rounded-md px-1.5 py-0.5 bg-muted/40 text-xs">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                autoRefresh
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle auto-refresh every 3 seconds"
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
              title="Refresh all data"
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

          {/* Theme Selector (Light, Dark, System) */}
          <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                theme === 'light'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Light Appearance (warm-neutral)"
              aria-label="Set light appearance"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                theme === 'dark'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Appearance (neutral charcoal)"
              aria-label="Set dark appearance"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
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

      {/* Secondary Bar: Clean Tab Navigation */}
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1 text-xs">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                    isActive
                      ? 'bg-background text-foreground shadow-xs border border-border/80 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
