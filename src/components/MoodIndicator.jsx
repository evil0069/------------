import { motion, AnimatePresence } from 'framer-motion';

/**
 * MoodIndicator — Small floating pill showing current detected mood
 */
export default function MoodIndicator({ mood }) {
  if (!mood || mood.name === 'neutral') return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood.name}
        className="mood-indicator"
        initial={{ opacity: 0, scale: 0.8, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 5 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <span className="mood-emoji">{mood.emoji}</span>
        <span className="mood-label">{mood.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
