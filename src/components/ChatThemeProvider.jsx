/**
 * ChatThemeProvider — Manages chat background themes
 * 12 Instagram-style themes with CSS variable overrides
 */

export const CHAT_THEMES = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    emoji: '⬛',
    preview: '#000000',
    vars: {},
  },
  {
    id: 'love',
    name: 'Love',
    emoji: '💕',
    preview: 'linear-gradient(135deg, #2d0a1e, #1a0a2e)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #2d0a1e 0%, #1a0a2e 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #e91e63, #9c27b0)',
      '--chat-accent': '#ff4081',
      '--chat-glow': 'rgba(233, 30, 99, 0.2)',
    },
    animated: 'hearts',
  },
  {
    id: 'tie-dye',
    name: 'Tie Dye',
    emoji: '🌈',
    preview: 'linear-gradient(135deg, #1a0533, #0a1628, #0d2818)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #1a0533 0%, #0a1628 50%, #0d2818 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #7c3aed, #2563eb)',
      '--chat-accent': '#a78bfa',
      '--chat-glow': 'rgba(124, 58, 237, 0.2)',
    },
  },
  {
    id: 'lo-fi',
    name: 'Lo-Fi',
    emoji: '🎵',
    preview: 'linear-gradient(135deg, #1a0a2e, #0d0d2b)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #1a0a2e 0%, #0d0d2b 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #6d28d9, #4c1d95)',
      '--chat-accent': '#c084fc',
      '--chat-glow': 'rgba(109, 40, 217, 0.15)',
    },
    animated: 'stars',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    preview: 'linear-gradient(135deg, #2d1b2e, #1a1020)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #2d1b2e 0%, #1a1020 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #ec4899, #f472b6)',
      '--chat-accent': '#f9a8d4',
      '--chat-glow': 'rgba(236, 72, 153, 0.15)',
    },
    animated: 'petals',
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    emoji: '🌃',
    preview: 'linear-gradient(135deg, #0a0a1a, #0d0520)',
    vars: {
      '--chat-bg': '#0a0a1a',
      '--chat-bubble-user': 'linear-gradient(135deg, #bd00ff, #00d4ff)',
      '--chat-accent': '#00d4ff',
      '--chat-glow': 'rgba(0, 212, 255, 0.15)',
    },
    animated: 'grid',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    preview: 'linear-gradient(135deg, #0a1628, #0d2233)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #0a1628 0%, #0d2233 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #0284c7, #0ea5e9)',
      '--chat-accent': '#38bdf8',
      '--chat-glow': 'rgba(2, 132, 199, 0.2)',
    },
    animated: 'waves',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    preview: 'linear-gradient(135deg, #2d1a0a, #1a0a1e)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #2d1a0a 0%, #1a0a1e 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #f97316, #ef4444)',
      '--chat-accent': '#fb923c',
      '--chat-glow': 'rgba(249, 115, 22, 0.2)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    preview: 'linear-gradient(135deg, #0d1f0d, #0a1a0d)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #0d1f0d 0%, #0a1a0d 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #16a34a, #22c55e)',
      '--chat-accent': '#4ade80',
      '--chat-glow': 'rgba(22, 163, 74, 0.15)',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    emoji: '🌌',
    preview: 'linear-gradient(135deg, #0a0015, #050520, #0a0015)',
    vars: {
      '--chat-bg': 'linear-gradient(135deg, #0a0015 0%, #050520 50%, #0a0015 100%)',
      '--chat-bubble-user': 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      '--chat-accent': '#a78bfa',
      '--chat-glow': 'rgba(139, 92, 246, 0.2)',
    },
    animated: 'stars',
  },
  {
    id: 'minimal-white',
    name: 'Minimal',
    emoji: '⬜',
    preview: '#f5f5f5',
    vars: {
      '--chat-bg': '#f5f5f5',
      '--chat-bubble-user': 'linear-gradient(135deg, #3b82f6, #6366f1)',
      '--chat-bubble-ai-bg': '#ffffff',
      '--chat-bubble-ai-text': '#1a1a1a',
      '--chat-text-muted': '#666666',
      '--chat-accent': '#3b82f6',
      '--chat-glow': 'rgba(59, 130, 246, 0.15)',
      '--chat-header-bg': 'rgba(255, 255, 255, 0.9)',
      '--chat-header-text': '#1a1a1a',
      '--chat-input-bg': '#ffffff',
      '--chat-input-text': '#1a1a1a',
      '--chat-input-border': '#e5e7eb',
      '--chat-divider-bg': 'rgba(0, 0, 0, 0.06)',
      '--chat-divider-text': '#888888',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '💜',
    preview: 'linear-gradient(135deg, #0a000f, #000000)',
    vars: {
      '--chat-bg': '#000000',
      '--chat-bubble-user': 'linear-gradient(45deg, #bd00ff, #fe00fe)',
      '--chat-accent': '#bd00ff',
      '--chat-glow': 'rgba(189, 0, 255, 0.3)',
    },
  },
];

/**
 * Get a theme by its ID
 */
export function getThemeById(id) {
  return CHAT_THEMES.find(t => t.id === id) || CHAT_THEMES[0];
}

/**
 * Apply a theme's CSS variables to a container element
 */
export function applyThemeVars(element, theme) {
  if (!element || !theme) return;

  // Reset custom vars
  const allVarNames = new Set();
  CHAT_THEMES.forEach(t => {
    Object.keys(t.vars || {}).forEach(k => allVarNames.add(k));
  });
  allVarNames.forEach(name => element.style.removeProperty(name));

  // Apply new vars
  if (theme.vars) {
    Object.entries(theme.vars).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  }
}
