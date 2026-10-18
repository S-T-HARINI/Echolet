'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { NavigationTab } from './Sidebar';
import {
  Sun,
  Moon,
  Laptop,
  Sliders,
  RefreshCw,
  RotateCcw,
  Menu,
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  Cpu,
  BookOpen,
} from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  systemStatus: string;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onRefresh,
  isRefreshing,
  autoRefresh,
  setAutoRefresh,
  systemStatus,
  onToggleMobileSidebar,
}) => {
  const { theme, setTheme, brightness, setBrightness, resetBrightness } = useTheme();

  const tabMeta: Record<
    NavigationTab,
    { label: string; icon: React.ReactNode; category: string }
  > = {
    overview: {
      label: 'Overview & Metrics',
      icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
      category: 'Workspace',
    },
    workshops: {
      label: 'Workshops Directory',
      icon: <Calendar className="w-4 h-4 text-primary" />,
      category: 'Workspace',
    },
    registrations: {
      label: 'Registrations',
      icon: <Users className="w-4 h-4 text-primary" />,
      category: 'Workspace',
    },
    outbox: {
      label: 'Transactional Outbox',
      icon: <Inbox className="w-4 h-4 text-primary" />,
      category: 'Operations',
    },
    simulator: {
      label: 'Failure Simulator & Mock Sink',
      icon: <Cpu className="w-4 h-4 text-primary" />,
      category: 'Operations',
    },
    architecture: {
      label: 'System Architecture',
      icon: <BookOpen className="w-4 h-4 text-primary" />,
      category: 'Documentation',
    },
  };

  const currentTab = tabMeta[activeTab] || tabMeta.overview;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/95 backdrop-blur-xs flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.05)]">
      {/* Left: Mobile Menu Toggle & Active Breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-xs sm:text-sm">
          <span className="text-muted-foreground hidden sm:inline font-medium">
            {currentTab.category}
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">/</span>
          <div className="flex items-center space-x-1.5 font-semibold text-foreground">
            {currentTab.icon}
            <span>{currentTab.label}</span>
          </div>
        </div>
      </div>

      {/* Right: Operational Controls & Theme/Brightness */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Live System Status Pill */}
        <div className="hidden sm:flex items-center">
          <span
            className={`inline-flex items-center space-x-1.5 text-xs px-2.5 py-0.5 rounded-full border font-medium ${
              systemStatus === 'healthy'
                ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                systemStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              } animate-pulse`}
            />
            <span>System {systemStatus === 'healthy' ? 'Healthy' : 'Degraded'}</span>
          </span>
        </div>

        {/* Auto Refresh & Manual Refresh */}
        <div className="flex items-center space-x-1 border border-border rounded-md px-1.5 py-0.5 bg-muted/60 text-xs">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              autoRefresh
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle background polling every 3 seconds"
          >
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Refresh current data"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Brightness Adjustment Slider (90% - 110%) with Reset Button */}
        <div className="hidden md:flex items-center space-x-2 border border-border rounded-md px-2.5 py-1 bg-muted/40 text-xs">
          <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Bright</span>
          <input
            type="range"
            min="0.9"
            max="1.1"
            step="0.01"
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Adjust interface surface brightness"
          />
          <span className="text-[11px] text-muted-foreground font-mono w-7">
            {Math.round(brightness * 100)}%
          </span>
          {Math.round(brightness * 100) !== 100 && (
            <button
              onClick={resetBrightness}
              className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
              title="Reset brightness to 100%"
              aria-label="Reset brightness to 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Theme Selector (Light, Dark, System) */}
        <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/50">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              theme === 'light'
                ? 'bg-primary-surface text-primary shadow-xs font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Light Appearance (Clean Google white)"
            aria-label="Light appearance"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              theme === 'dark'
                ? 'bg-primary-surface text-primary shadow-xs font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Dark Appearance (Google charcoal #202124)"
            aria-label="Dark appearance"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              theme === 'system'
                ? 'bg-primary-surface text-primary shadow-xs font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Follow System Appearance"
            aria-label="System appearance"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
