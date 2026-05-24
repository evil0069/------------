import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STICKERS = {
  Love: [
    { emoji: '❤️', label: 'Heart' },
    { emoji: '💖', label: 'Sparkling' },
    { emoji: '💋', label: 'Kiss' },
    { emoji: '🌹', label: 'Rose' },
    { emoji: '💍', label: 'Ring' },
  ],
  Cute: [
    { emoji: '🤗', label: 'Hug' },
    { emoji: '🥰', label: 'Blushing' },
    { emoji: '🤩', label: 'Star Eyes' },
    { emoji: '🦋', label: 'Butterfly' },
    { emoji: '🌙', label: 'Moon' },
  ],
  Fun: [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '🎉', label: 'Party' },
    { emoji: '🎵', label: 'Music' },
    { emoji: '👑', label: 'Crown' },
    { emoji: '✨', label: 'Sparkles' },
  ],
};

const CATEGORIES = Object.keys(STICKERS);

/**
 * StickerPanel — Instagram-style slide-up sticker grid
 */
export default function StickerPanel({ visible, onSendSticker, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Love');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="sticker-panel"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="sticker-panel-header">
            <div className="sticker-categories">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`sticker-category-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button className="sticker-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="sticker-grid">
            {STICKERS[activeCategory].map((sticker) => (
              <motion.button
                key={sticker.emoji}
                className="sticker-item"
                onClick={() => {
                  onSendSticker(sticker.emoji);
                  onClose();
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="sticker-emoji">{sticker.emoji}</span>
                <span className="sticker-label">{sticker.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
