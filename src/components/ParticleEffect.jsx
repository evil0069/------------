import { useEffect, useState } from 'react';

/**
 * ParticleEffect — Burst of particles when sticker is sent
 * Uses CSS keyframes for performance
 */
export default function ParticleEffect({ emoji, trigger }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return;

    const particleEmojis = {
      '❤️': ['❤️', '💕', '💗', '♥️'],
      '💖': ['💖', '💕', '✨', '💗'],
      '💋': ['💋', '💕', '❤️', '✨'],
      '🌹': ['🌹', '🌸', '💐', '🌺'],
      '💍': ['💍', '✨', '💎', '💫'],
      '🔥': ['🔥', '🔥', '✨', '💥'],
      '🎉': ['🎉', '🎊', '🎈', '✨'],
      '✨': ['✨', '⭐', '💫', '🌟'],
    };

    const emojis = particleEmojis[emoji] || [emoji, '✨'];

    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: 30 + Math.random() * 40,
      startY: 60 + Math.random() * 20,
      endX: (Math.random() - 0.5) * 80,
      endY: -(40 + Math.random() * 40),
      delay: Math.random() * 0.4,
      duration: 1 + Math.random() * 1,
      size: 14 + Math.random() * 18,
      rotation: Math.random() * 720 - 360,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger, emoji]);

  if (particles.length === 0) return null;

  return (
    <div className="particle-effect-container">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.startY}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--end-x': `${p.endX}vw`,
            '--end-y': `${p.endY}vh`,
            '--rotation': `${p.rotation}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
