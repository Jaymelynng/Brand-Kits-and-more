import type { CSSProperties } from 'react';
import { contrast } from '@/lib/shade';

interface GymColorProviderProps {
  primaryColor?: string;
  secondaryColor?: string;
  children: React.ReactNode;
}

export const GymColorProvider = ({ primaryColor, secondaryColor, children }: GymColorProviderProps) => {
  const primary = primaryColor ? hexToHsl(primaryColor) : '222 47% 11%';
  const secondary = secondaryColor ? hexToHsl(secondaryColor) : '215 20% 65%';
  // A card owns its palette. Writing to documentElement let the last gym
  // silently recolor every other card on the dashboard.
  return <div style={{
    display: 'contents',
    '--gym-primary': primary,
    '--gym-secondary': secondary,
    '--gym-primary-foreground': primaryColor && contrast(primaryColor, '#ffffff') < 4.5 ? '0 0% 7%' : '0 0% 100%',
    '--gym-secondary-foreground': secondaryColor && contrast(secondaryColor, '#ffffff') < 4.5 ? '0 0% 7%' : '0 0% 100%',
    '--gym-primary-light': `${primary.split(' ').slice(0, 2).join(' ')} 96%`,
    '--gym-secondary-light': `${secondary.split(' ').slice(0, 2).join(' ')} 95%`,
  } as CSSProperties}>{children}</div>;
};

// Helper function to convert hex to HSL
const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};
