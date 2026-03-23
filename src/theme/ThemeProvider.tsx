'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Vendor, 
  Mode, 
  VendorTheme,
  ThemeColors,
  ColorMode,
  getVendorTheme, 
  getThemeCssVariables,
  getThemeColors
} from './vendorThemes';

interface ThemeContextValue {
  // Vendor state
  vendor: Vendor;
  setVendor: (vendor: Vendor) => void;
  toggleVendor: () => void;
  theme: VendorTheme;
  // Active colors based on colorMode
  colors: ThemeColors;
  
  // Mode state (patient/practitioner)
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  
  // Panel state
  isLeftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  toggleLeftPanel: () => void;
  
  isRightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  
  // Color mode (light/dark)
  colorMode: 'light' | 'dark';
  setColorMode: (mode: 'light' | 'dark') => void;
  toggleColorMode: () => void;

  // User role (for conditional UI like practitioner mode)
  userRole: string;
  setUserRole: (role: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultVendor?: Vendor;
  defaultMode?: Mode;
  defaultColorMode?: 'light' | 'dark';
}

// localStorage keys for user preferences
const STORAGE_KEYS = {
  colorMode: 'meo-color-mode',
  vendor: 'meo-vendor',
  mode: 'meo-mode',
} as const;

export function ThemeProvider({
  children,
  defaultVendor = 'meterbolic',
  defaultMode = 'patient',
  defaultColorMode = 'light',
}: ThemeProviderProps) {
  // Initialize with defaults (SSR-safe), then hydrate from localStorage in useEffect
  const [vendor, setVendorState] = useState<Vendor>(defaultVendor);
  const [theme, setTheme] = useState<VendorTheme>(getVendorTheme(defaultVendor));
  const [mode, setModeState] = useState<Mode>(defaultMode);
  const [isLeftPanelOpen, setLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [colorMode, setColorModeState] = useState<ColorMode>(defaultColorMode);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount (prevents SSR mismatch)
  useEffect(() => {
    const savedVendor = localStorage.getItem(STORAGE_KEYS.vendor);
    if (savedVendor === 'meterbolic' || savedVendor === 'eos') {
      setVendorState(savedVendor);
    }
    const savedMode = localStorage.getItem(STORAGE_KEYS.mode);
    if (savedMode === 'patient' || savedMode === 'practitioner') {
      setModeState(savedMode);
    }
    const savedColor = localStorage.getItem(STORAGE_KEYS.colorMode);
    if (savedColor === 'light' || savedColor === 'dark') {
      setColorModeState(savedColor);
    }
    setMounted(true);
  }, []);

  // Compute active colors based on colorMode
  const colors = useMemo(() => getThemeColors(theme, colorMode), [theme, colorMode]);

  // Apply CSS variables when vendor changes
  useEffect(() => {
    const newTheme = getVendorTheme(vendor);
    setTheme(newTheme);
    
    // Apply CSS custom properties to document root
    const root = document.documentElement;
    const cssVars = getThemeCssVariables(newTheme);
    
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Set data attribute for vendor-specific CSS
    root.setAttribute('data-vendor', vendor);
  }, [vendor]);

  // Apply color mode
  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  // Vendor methods
  const setVendor = useCallback((newVendor: Vendor) => {
    setVendorState(newVendor);
    localStorage.setItem(STORAGE_KEYS.vendor, newVendor);
  }, []);

  const toggleVendor = useCallback(() => {
    setVendorState(prev => {
      const newVendor = prev === 'meterbolic' ? 'eos' : 'meterbolic';
      localStorage.setItem(STORAGE_KEYS.vendor, newVendor);
      return newVendor;
    });
  }, []);

  // Mode methods
  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
    // Auto-open right panel when switching to practitioner mode
    if (newMode === 'practitioner') {
      setRightPanelOpen(true);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const newMode = prev === 'patient' ? 'practitioner' : 'patient';
      localStorage.setItem(STORAGE_KEYS.mode, newMode);
      // Auto-open right panel when switching to practitioner mode
      if (newMode === 'practitioner') {
        setRightPanelOpen(true);
      }
      return newMode;
    });
  }, []);

  // Panel methods
  const toggleLeftPanel = useCallback(() => {
    setLeftPanelOpen(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen(prev => !prev);
  }, []);

  // Color mode methods
  const setColorMode = useCallback((newMode: ColorMode) => {
    setColorModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.colorMode, newMode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState(prev => {
      const newMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEYS.colorMode, newMode);
      return newMode;
    });
  }, []);

  // User role (set from /api/me response by MeOApp)
  const [userRole, setUserRole] = useState<string>('demo');

  const contextValue: ThemeContextValue = {
    vendor,
    setVendor,
    toggleVendor,
    theme,
    colors,
    mode,
    setMode,
    toggleMode,
    isLeftPanelOpen,
    setLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    setRightPanelOpen,
    toggleRightPanel,
    colorMode,
    setColorMode,
    toggleColorMode,
    userRole,
    setUserRole,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export types
export type { ThemeContextValue };
