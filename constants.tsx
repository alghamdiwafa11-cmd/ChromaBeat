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
  { name: 'Neon Blue', primary: '#3b82f6', secondary: '#1d4ed8' },
  { name: 'Cyber Pink', primary: '#ec4899', secondary: '#be185d' },
  { name: 'Toxic Green', primary: '#22c55e', secondary: '#15803d' },
  { name: 'Sunset Gold', primary: '#f59e0b', secondary: '#b45309' },
  { name: 'Lava Red', primary: '#ef4444', secondary: '#b91c1c' },
  { name: 'Pure White', primary: '#ffffff', secondary: '#94a3b8' },
];

export const FONTS = [
  { name: 'Modern Sans', value: "'Inter', sans-serif" },
  { name: 'Brutalist', value: "'Space Grotesk', sans-serif" },
  { name: 'Classic Serif', value: "serif" },
  { name: 'Tech Mono', value: "monospace" },
  { name: 'Heavy Display', value: "system-ui, sans-serif" },
];

export const EXPORT_QUALITIES: { id: ExportQuality; label: string }[] = [
  { id: '720p', label: 'HD 720p' },
  { id: '1080p', label: 'FHD 1080p' },
  { id: '2K', label: 'Ultra 2K' },
  { id: '4K', label: 'Cinematic 4K' },
];

export const FILTERS = [
  { name: 'None', class: '' },
  { name: 'Noir', class: 'grayscale brightness-75 contrast-125' },
  { name: 'Vintage', class: 'sepia brightness-90' },
  { name: 'Hyper', class: 'saturate-200 hue-rotate-15' },
  { name: 'Dream', class: 'blur-[2px] opacity-80' },
];

export const PRICING_CONFIG = {
  currentPlan: {
    id: 'monthly_pro',
    name: 'Pro Monthly',
    price: '10.00',
    currency: '£',
    billingCycle: 'Per Month',
    badge: 'MOST POPULAR',
    features: [
      'Unlimited 4K Video Exports',
      'Advanced AI Lyric Sync',
      'Exclusive Veo Video Generation',
      'Priority Cloud Rendering',
      'No Watermarks',
      'Direct Social Export (TikTok/IG)'
    ]
  }
};