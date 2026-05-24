import { useEffect, useState } from 'react';

/**
 * MessageEffect — Full-screen particle effects triggered by emoji messages
 * Hearts, confetti, fire, sparkles — pure CSS animations
 */

const EFFECT_MAP = {
  '❤️': { particle: '❤️', count: 20, className: 'effect-hearts' },
  '💕': { particle: '💕', count: 15, className: 'effect-hearts' },
  '💖': { particle: '💖', count: 15, className: 'effect-hearts' },
  '🎉': { particle: '🎉', count: 25, className: 'effect-confetti' },
  '🔥': { particle: '🔥', count: 15, className: 'effect-fire' },
  '✨': { particle: '✨', count: 20, className: 'effect-sparkle' },
  '🌹': { particle: '🌹', count: 12, className: 'effect-hearts' },
  '💋': { particle: '💋', count: 12, className: 'effect-hearts' },
  '🥰': { particle: '❤️', count: 15, className: 'effect-hearts' },
};

function isEmojiOnlyMessage(text) {
  if (!text) return null;
  const trimmed = text.trim();
  // Check if the message is just a single emoji (or a few)
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\uFE0F\s]{1,5}$/u;
  if (emojiRegex.test(trimmed)) {
    // Find a matching effect
    for (const [emoji, config] of Object.entries(EFFECT_MAP)) {
      if (trimmed.includes(emoji)) return config;
    }
  }
  return null;
}

export default function MessageEffect({ messageText, onComplete }) {
  const [particles, setParticles] = useState([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const effect = isEmojiOnlyMessage(messageText);
    if (!effect) return;

    const newParticles = Array.from({ length: effect.count }, (_, i) => ({
      id: i,
      emoji: effect.particle,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 1.5,
      size: 16 + Math.random() * 20,
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);
    setActive(true);

    const timer = setTimeout(() => {
      setActive(false);
      setParticles([]);
      if (onComplete) onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [messageText, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="message-effect-container">
      {particles.map((p) => (
        <span
          key={p.id}
          className="message-effect-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}px`,
            '--rotation': `${p.rotation}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

export { isEmojiOnlyMessage, EFFECT_MAP };
