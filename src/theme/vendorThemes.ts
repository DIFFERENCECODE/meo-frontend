// Vendor Theme Definitions
// Defines theme tokens for Meterbolic and Eos vendors

export type Vendor = 'meterbolic' | 'eos';
export type Mode = 'patient' | 'practitioner';
export type ColorMode = 'light' | 'dark';

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  
  // Background colors
  background: string;
  backgroundGradientStart: string;
  backgroundGradientMid: string;
  backgroundGradientEnd: string;
  
  // Surface/Card colors
  card: string;
  cardHover: string;
  cardBorder: string;
  
  // Text colors
  foreground: string;
  muted: string;
  
  // Accent colors
  accent: string;
  accentHover: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  
  // Chart colors
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
}

export interface VendorTheme {
  id: Vendor;
  name: string;
  header: string;
  tagline: string;
  colors: ThemeColors;
  darkColors: ThemeColors;
  // CSS custom property overrides  
  cssVariables: Record<string, string>;
}

// Meterbolic Theme - Default teal/lime theme
export const meterbolicTheme: VendorTheme = {
  id: 'meterbolic',
  name: 'Meterbolic',
  header: 'MeO',
  tagline: 'Your Metabolic Health AI Assistant',
  // Light mode - Meterbolic branding (teal gradient)
  colors: {
    primary: '#a4d65e',
    primaryHover: '#8bc34a',
    primaryForeground: '#1a3a3a',
    
    background: '#1a3a3a',
    backgroundGradientStart: '#1a3a3a',
    backgroundGradientMid: '#264545',
    backgroundGradientEnd: '#2a5555',
    
    card: 'rgba(40, 70, 70, 0.8)',
    cardHover: 'rgba(50, 80, 80, 0.9)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    
    foreground: '#ffffff',
    muted: 'rgba(255, 255, 255, 0.6)',
    
    accent: 'rgba(164, 214, 94, 0.15)',
    accentHover: 'rgba(164, 214, 94, 0.25)',
    
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444',
    
    chartPrimary: '#3b82f6',
    chartSecondary: '#f97316',
    chartTertiary: '#a4d65e',
  },
  // Dark mode - Gemini/GPT style (dark gray)
  darkColors: {
    primary: '#a4d65e',
    primaryHover: '#8bc34a',
    primaryForeground: '#1a1a1a',
    
    background: '#1a1a1a',
    backgroundGradientStart: '#1a1a1a',
    backgroundGradientMid: '#1a1a1a',
    backgroundGradientEnd: '#1a1a1a',
    
    card: '#2f2f2f',
    cardHover: '#3a3a3a',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    
    foreground: '#e3e3e3',
    muted: 'rgba(255, 255, 255, 0.5)',
    
    accent: 'rgba(164, 214, 94, 0.15)',
    accentHover: 'rgba(164, 214, 94, 0.25)',
    
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444',
    
    chartPrimary: '#3b82f6',
    chartSecondary: '#f97316',
    chartTertiary: '#a4d65e',
  },
  cssVariables: {
    '--vendor-primary': '#a4d65e',
    '--vendor-primary-hover': '#8bc34a',
    '--vendor-primary-foreground': '#1a3a3a',
    '--vendor-background': '#2C5858',
    '--vendor-background-gradient': 'linear-gradient(180deg, #2a5555 0%, #1e4444 40%, #1a3a3a 100%)',
    '--vendor-card': 'rgba(40, 70, 70, 0.8)',
    '--vendor-card-border': 'rgba(255, 255, 255, 0.1)',
    '--vendor-foreground': '#ffffff',
    '--vendor-muted': 'rgba(255, 255, 255, 0.6)',
    '--vendor-accent': 'rgba(164, 214, 94, 0.15)',
  },
};

// Eos Theme - Dr. Arup Sen clinic — warm gold/navy medical branding
export const eosTheme: VendorTheme = {
  id: 'eos',
  name: 'Eos',
  header: 'MeO for Eos',
  tagline: 'Prevention over cure.',
  // Light mode - Warm navy/gold
  colors: {
    primary: '#d4a853',
    primaryHover: '#c49a42',
    primaryForeground: '#1a1a2e',

    background: '#1a1a2e',
    backgroundGradientStart: '#1a1a2e',
    backgroundGradientMid: '#232345',
    backgroundGradientEnd: '#2a2a55',

    card: 'rgba(35, 35, 65, 0.85)',
    cardHover: 'rgba(45, 45, 80, 0.9)',
    cardBorder: 'rgba(212, 168, 83, 0.15)',

    foreground: '#f0ece4',
    muted: 'rgba(240, 236, 228, 0.55)',

    accent: 'rgba(212, 168, 83, 0.12)',
    accentHover: 'rgba(212, 168, 83, 0.22)',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',

    chartPrimary: '#6366f1',
    chartSecondary: '#d4a853',
    chartTertiary: '#22c55e',
  },
  // Dark mode - Deep charcoal with gold accents
  darkColors: {
    primary: '#d4a853',
    primaryHover: '#c49a42',
    primaryForeground: '#1a1a1a',

    background: '#121212',
    backgroundGradientStart: '#121212',
    backgroundGradientMid: '#121212',
    backgroundGradientEnd: '#121212',

    card: '#1e1e2e',
    cardHover: '#2a2a3e',
    cardBorder: 'rgba(212, 168, 83, 0.15)',

    foreground: '#e8e4dc',
    muted: 'rgba(232, 228, 220, 0.5)',

    accent: 'rgba(212, 168, 83, 0.12)',
    accentHover: 'rgba(212, 168, 83, 0.22)',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',

    chartPrimary: '#6366f1',
    chartSecondary: '#d4a853',
    chartTertiary: '#22c55e',
  },
  cssVariables: {
    '--vendor-primary': '#d4a853',
    '--vendor-primary-hover': '#c49a42',
    '--vendor-primary-foreground': '#1a1a2e',
    '--vendor-background': '#1a1a2e',
    '--vendor-background-gradient': 'linear-gradient(180deg, #2a2a55 0%, #232345 40%, #1a1a2e 100%)',
    '--vendor-card': 'rgba(35, 35, 65, 0.85)',
    '--vendor-card-border': 'rgba(212, 168, 83, 0.15)',
    '--vendor-foreground': '#f0ece4',
    '--vendor-muted': 'rgba(240, 236, 228, 0.55)',
    '--vendor-accent': 'rgba(212, 168, 83, 0.12)',
  },
};

// Theme lookup
export const vendorThemes: Record<Vendor, VendorTheme> = {
  meterbolic: meterbolicTheme,
  eos: eosTheme,
};

// Get theme by vendor
export function getVendorTheme(vendor: Vendor): VendorTheme {
  return vendorThemes[vendor] || meterbolicTheme;
}

// Get the active colors based on colorMode
export function getThemeColors(theme: VendorTheme, colorMode: ColorMode): ThemeColors {
  return colorMode === 'dark' ? theme.darkColors : theme.colors;
}

// Generate CSS custom properties from theme
export function getThemeCssVariables(theme: VendorTheme): Record<string, string> {
  return {
    ...theme.cssVariables,
    '--vendor-success': theme.colors.success,
    '--vendor-warning': theme.colors.warning,
    '--vendor-error': theme.colors.error,
    '--vendor-chart-primary': theme.colors.chartPrimary,
    '--vendor-chart-secondary': theme.colors.chartSecondary,
    '--vendor-chart-tertiary': theme.colors.chartTertiary,
  };
}
