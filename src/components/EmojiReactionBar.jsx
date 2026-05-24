import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

/**
 * EmojiReactionBar — Floating emoji pill and action context menu
 * Matches premium Instagram DM design
 */
export default function EmojiReactionBar({
  visible, onReact, onClose, position,
  isUser, text, onUnsend, onReply
}) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className="reaction-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="emoji-reaction-bar-container"
            style={position ? { top: position.y, left: Math.max(10, Math.min(position.x, window.innerWidth - 180)) } : {}}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 450 }}
          >
            {/* Emojis selector row */}
            <div className="emoji-reaction-bar" style={{ position: 'static' }}>
              {REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  className="reaction-emoji-btn"
                  onClick={() => {
                    onReact(emoji);
                    onClose();
                  }}
                  whileHover={{ scale: 1.35 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>

            {/* Premium Instagram-style bubble options menu */}
            <div className="reaction-actions-menu">
              <button
                className="menu-action-item"
                onClick={() => {
                  navigator.clipboard.writeText(text || '');
                  onClose();
                }}
              >
                <span>📋</span> Copy Text
              </button>
              <button
                className="menu-action-item"
                onClick={() => {
                  if (onReply) onReply();
                  onClose();
                }}
              >
                <span>💬</span> Reply
              </button>
              {isUser && onUnsend && (
                <button
                  className="menu-action-item danger"
                  onClick={() => {
                    if (onUnsend) onUnsend();
                    onClose();
                  }}
                >
                  <span>↩️</span> Unsend Message
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { REACTIONS };
