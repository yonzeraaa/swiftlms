/**
 * Design Tokens - Sistema Centralizado de Design
 * SwiftEDU - Navy & Gold Premium Theme
 */

// Golden Ratio
export const GOLDEN_RATIO = 1.618

// Paleta de Cores Semânticas
export const colors = {
  // Cores Principais
  navy: {
    50: '#0066cc',
    100: '#0052a3',
    200: '#004080',
    300: '#003366',
    400: '#002952',
    500: '#001f3f',
    600: '#001a33',
    700: '#001529',
    800: '#00101f',
    900: '#000a14',
    950: '#003366'
  },
  gold: {
    50: '#FFF9E6',
    100: '#FFF3CC',
    200: '#FFE799',
    300: '#FFDB66',
    400: '#FFD433',
    500: '#FFD700',
    600: '#E6C200',
    700: '#B39700',
    800: '#806B00',
    900: '#4D4000'
  },

  // Cores Semânticas
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  }
}

// Sistema de Espaçamento (Golden Ratio)
export const spacing = {
  xs: '0.25rem',      // 4px
  sm: '0.5rem',       // 8px
  md: '0.809rem',     // 13px (8 * 1.618)
  lg: '1.309rem',     // 21px (13 * 1.618)
  xl: '2.118rem',     // 34px (21 * 1.618)
  '2xl': '3.427rem',  // 55px (34 * 1.618)
  '3xl': '5.545rem',  // 89px (55 * 1.618)
  '4xl': '8.972rem'   // 144px (89 * 1.618)
}

// Tipografia
export const typography = {
  fontFamily: {
    sans: 'Open Sans, system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace'
  },

  // Fluid Typography usando clamp
  fontSize: {
    xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
    sm: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
    base: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
    lg: 'clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem)',
    xl: 'clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)',
    '2xl': 'clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem)',
    '3xl': 'clamp(1.875rem, 1.65rem + 1.125vw, 2.25rem)',
    '4xl': 'clamp(2.25rem, 1.95rem + 1.5vw, 3rem)',
    '5xl': 'clamp(3rem, 2.55rem + 2.25vw, 3.75rem)'
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800
  }
}

// Sistema de Sombras e Elevação
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Sombras temáticas
  gold: '0 10px 30px -5px rgba(255, 215, 0, 0.3)',
  goldLg: '0 20px 40px -10px rgba(255, 215, 0, 0.4)',
  navy: '0 10px 30px -5px rgba(0, 31, 63, 0.5)'
}

// Sistema de Elevação (Z-Index)
export const elevation = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
}

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  base: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px'
}

// Transições e Durações
export const transitions = {
  duration: {
    fast: '150ms',
    base: '300ms',
    slow: '500ms',
    slower: '700ms'
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
}

// Breakpoints Responsivos
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Grid e Layout
export const layout = {
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%'
  },

  container: {
    padding: {
      mobile: '1rem',
      tablet: '1.5rem',
      desktop: '2rem'
    }
  }
}
