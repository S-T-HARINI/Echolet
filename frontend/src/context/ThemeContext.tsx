'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  brightness: number;
  setBrightness: (brightness: number) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [brightness, setBrightnessState] = useState<number>(1.0);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('echolet_theme') as ThemeMode | null;
    const savedBrightness = localStorage.getItem('echolet_brightness');

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      setThemeState('light');
    }
    if (savedBrightness) {
      const parsed = parseFloat(savedBrightness);
      if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.3) {
        setBrightnessState(parsed);
      }
    }
  }, []);

  // Update DOM classes & listener for system preferences
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
        setActualTheme('dark');
      } else {
        root.classList.remove('dark');
        setActualTheme('light');
      }
    };

    applyTheme();

    const handler = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Apply brightness filter variable
  useEffect(() => {
    document.documentElement.style.setProperty('--brightness', brightness.toString());
  }, [brightness]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('echolet_theme', newTheme);
  };

  const setBrightness = (newBrightness: number) => {
    const clamped = Math.min(1.3, Math.max(0.7, newBrightness));
    setBrightnessState(clamped);
    localStorage.setItem('echolet_brightness', clamped.toString());
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, brightness, setBrightness, actualTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
