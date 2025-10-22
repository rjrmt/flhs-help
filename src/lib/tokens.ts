// Design system tokens for Apple-grade mobile interface
export const tokens = {
  colors: {
    // Dark canvas
    canvas: '#0B0F14',
    
    // Frosted glass
    glass: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    
    // Primary actions
    primary: {
      blue: '#007AFF',
      green: '#34C759',
      red: '#FF3B30',
      orange: '#FF9500',
    },
    
    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
      tertiary: 'rgba(255, 255, 255, 0.4)',
    },
    
    // Status colors
    status: {
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#007AFF',
    },
    
    // Chip colors
    chip: {
      default: 'rgba(255, 255, 255, 0.1)',
      warning: 'rgba(255, 149, 0, 0.2)',
      error: 'rgba(255, 59, 48, 0.2)',
      success: 'rgba(52, 199, 89, 0.2)',
    },
  },
  
  typography: {
    // SF Pro font sizes (matching iOS)
    sizes: {
      largeTitle: '34px',
      title1: '28px',
      title2: '22px',
      title3: '20px',
      headline: '17px',
      body: '17px',
      callout: '16px',
      subhead: '15px',
      footnote: '13px',
      caption1: '12px',
      caption2: '11px',
    },
    
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  
  transitions: {
    fast: '140ms',
    normal: '160ms',
    slow: '180ms',
  },
  
  // Animation easing
  easing: {
    ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const;

// Helper function to create glass effect styles
export const glassEffect = {
  background: tokens.colors.glass.bg,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${tokens.colors.glass.border}`,
} as const;
