'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Sun,
  Moon,
  Laptop,
  Sliders,
  RefreshCw,
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  Cpu,
  BookOpen,
  LogOut,
  RotateCcw,
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
  const { theme, setTheme, brightness, setBrightness, resetBrightness } = useTheme();
  const { user, logout } = useAuth();

  const isOrganizer = user?.role === 'ORGANIZER';

  // Role-filtered navigation items
  const allNavItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    organizerOnly?: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'workshops',
      label: 'Workshops',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'registrations',
      label: isOrganizer ? 'Registrations' : 'My Registrations',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'outbox',
      label: 'Transactional Outbox',
      icon: <Inbox className="w-4 h-4" />,
      organizerOnly: true,
      badge:
        outboxPendingCount > 0 ? (
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-status-warning-bg text-status-warning-text border border-status-warning-border">
            {outboxPendingCount}
          </span>
        ) : undefined,
    },
    {
      id: 'simulator',
      label: 'Failure Simulator',
      icon: <Cpu className="w-4 h-4" />,
      organizerOnly: true,
      badge:
        simulatorMode && simulatorMode !== 'normal' ? (
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-status-danger-bg text-status-danger-text border border-status-danger-border">
            {simulatorMode.toUpperCase()}
          </span>
        ) : undefined,
    },
    {
      id: 'architecture',
      label: 'System Architecture',
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => !item.organizerOnly || isOrganizer);

  // User initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 shadow-[0_1px_2px_0_rgba(60,64,67,0.06)]">
      {/* Top Header Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand & Status */}
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-xs">
              <span className="text-sm font-bold text-white tracking-wider leading-none">E</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-base tracking-tight leading-tight">
                EchoLet
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline leading-none font-medium">
                Workshop &amp; Outbox Engine
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center pl-3 border-l border-border-subtle">
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
        </div>

        {/* Right: Controls & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Auto Refresh & Manual Refresh */}
          <div className="flex items-center space-x-1 border border-border rounded-md px-1.5 py-0.5 bg-muted/60 text-xs">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                autoRefresh
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle auto-refresh every 3 seconds"
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Refresh all data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Brightness Adjustment Slider (90% - 110%) with Reset Button */}
          <div className="hidden lg:flex items-center space-x-2 border border-border rounded-md px-2.5 py-1 bg-muted/40 text-xs">
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
              aria-label="Interface brightness adjustment"
            />
            <span className="text-[11px] text-muted-foreground font-mono w-7">
              {Math.round(brightness * 100)}%
            </span>
            {Math.round(brightness * 100) !== 100 && (
              <button
                onClick={resetBrightness}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                title="Reset brightness to 100%"
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
              aria-label="Set light appearance"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                theme === 'dark'
                  ? 'bg-primary-surface text-primary shadow-xs font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Appearance (Google charcoal #202124)"
              aria-label="Set dark appearance"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                theme === 'system'
                  ? 'bg-primary-surface text-primary shadow-xs font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="System Appearance"
              aria-label="Follow system appearance"
            >
              <Laptop className="w-4 h-4" />
            </button>
          </div>

          {/* User Account / Profile & Sign Out */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-border-subtle">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-medium text-foreground leading-none">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                        isOrganizer
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-t border-border-subtle bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto text-sm">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 font-medium whitespace-nowrap transition-colors relative border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                    {item.icon}
                  </span>
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
