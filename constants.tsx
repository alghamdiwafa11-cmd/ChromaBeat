
import React from 'react';
import { Music, BarChart3, Waves, Circle, Sparkles, MoveHorizontal, Grid3X3 } from 'lucide-react';
import { ExportQuality } from './types';

export const VISUALIZER_MODES = [
  { id: 'bars', name: 'Spectrum', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'waves', name: 'Waves', icon: <Waves className="w-4 h-4" /> },
  { id: 'circle', name: 'Orb', icon: <Circle className="w-4 h-4" /> },
  { id: 'particles', name: 'Dust', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'symmetry', name: 'Symmetry', icon: <MoveHorizontal className="w-4 h-4" /> },
  { id: 'grid', name: 'Digital Grid', icon: <Grid3X3 className="w-4 h-4" /> },
] as const;

export const COLOR_PALETTES = [
  { name: 'Neon Blue', value: '#3b82f6' },
  { name: 'Cyber Pink', value: '#ec4899' },
  { name: 'Toxic Green', value: '#22c55e' },
  { name: 'Sunset Gold', value: '#f59e0b' },
  { name: 'Clean White', value: '#ffffff' },
  { name: 'Lava Red', value: '#ef4444' },
];

export const FONTS = [
  { name: 'Modern Sans', value: "'Inter', sans-serif" },
  { name: 'Brutalist', value: "'Space Grotesk', sans-serif" },
  { name: 'Classic Serif', value: "serif" },
  { name: 'Tech Mono', value: "monospace" },
];

export const EXPORT_QUALITIES: ExportQuality[] = ['720p', '1080p', '2K', '4K', '5K'];

export const FILTERS = [
  { name: 'None', class: '' },
  { name: 'Noir', class: 'grayscale brightness-75 contrast-125' },
  { name: 'Vintage', class: 'sepia brightness-90' },
  { name: 'Muted', class: 'saturate-50 contrast-75' },
  { name: 'Hyper', class: 'saturate-200 hue-rotate-15' },
  { name: 'Dream', class: 'blur-[2px] opacity-80' },
];

/**
 * PRICING CONFIGURATION
 * Change these values to update your payment terms across the whole app.
 */
export const PRICING_CONFIG = {
  currentPlan: {
    id: 'lifetime_pro',
    name: 'Lifetime Pro',
    price: '9.99',
    originalPrice: '49.99',
    currency: '$',
    billingCycle: 'Single Payment',
    badge: 'LIFETIME ACCESS',
    discount: '80% OFF',
    features: [
      'Unlimited 5K Exports',
      'Advanced Beat Intensity',
      'Direct TikTok Sync',
      'Priority AI Cloud',
      'Custom Watermarks',
      '24/7 Creator Support'
    ]
  }
};
