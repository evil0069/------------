import { motion } from 'framer-motion';

export default function TypingIndicator({ aiName }) {
  return (
    <motion.div
      className="chat-bubble-wrapper ai"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="chat-avatar">
        <img src="./images/companion-4.jpg" alt={aiName || 'Chance'} />
      </div>
      <div className="chat-bubble ai-bubble typing-bubble">
        <span className="bubble-sender">{aiName || 'Chance'}</span>
        <div className="typing-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </motion.div>
  );
}
