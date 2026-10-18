'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Shield,
  Key,
  Calendar,
  Sliders,
  Sun,
  Moon,
  Laptop,
  LogOut,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, brightness, setBrightness, resetBrightness } = useTheme();

  const isOrganizer = user?.role === 'ORGANIZER';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your authenticated profile, visual preferences, and session security.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="google-card bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-[#1a73e8]/10 text-[#1a73e8] border border-[#1a73e8]/25 flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-semibold text-foreground">{user?.name}</h2>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isOrganizer
                    ? 'bg-status-info-bg text-status-info-text border-status-info-border'
                    : 'bg-status-success-bg text-status-success-text border-status-success-border'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
          </div>
        </div>

        {/* Account Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-subtle text-xs">
          <div className="flex items-start space-x-2.5">
            <Key className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">User ID</span>
              <p className="font-mono text-foreground font-medium select-all mt-0.5">
                {user?.id || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">Role Permissions</span>
              <p className="text-foreground font-medium mt-0.5">
                {isOrganizer
                  ? 'Authorized Workshop Manager & Transactional Outbox Admin'
                  : 'Authorized Workshop Attendee (Isolated Booking Records)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Surface Brightness Card */}
      <div className="google-card bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Appearance &amp; Surface Tone</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your preferred color theme and adjust surface brightness independently.
          </p>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Theme Mode</label>
          <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50 gap-1">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === 'system'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Laptop className="w-4 h-4 text-muted-foreground" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Brightness Adjustment */}
        <div className="space-y-2 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Surface Brightness Offset</span>
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {Math.round(brightness * 100)}%
              </span>
              {Math.round(brightness * 100) !== 100 && (
                <button
                  onClick={resetBrightness}
                  className="text-xs text-[#1a73e8] hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to 100%</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Shifts neutral background and card lightness between 90% and 110% while keeping text contrast at 100%.
          </p>
          <input
            type="range"
            min="0.9"
            max="1.1"
            step="0.01"
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="w-full max-w-sm h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-[#1a73e8]"
          />
        </div>
      </div>

      {/* Session Security & Sign Out */}
      <div className="google-card bg-card border border-border rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Safely terminate your authenticated session on this browser.
          </p>
        </div>
        <button
          onClick={logout}
          className="btn-google-secondary px-4 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
