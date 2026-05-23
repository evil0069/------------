import { motion } from 'framer-motion';

export default function ChatBubble({ message, isUser, timestamp, aiName, isFirstInGroup, isLastInGroup, replyTo, onReply }) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const groupClass = isFirstInGroup && isLastInGroup 
    ? 'group-single' 
    : isFirstInGroup 
      ? 'group-first' 
      : isLastInGroup 
        ? 'group-last' 
        : 'group-middle';

  const renderMessageWithImages = (text) => {
    if (!text) return null;
    
    // Split by markdown image pattern or standard link pattern that points to pollinations
    const parts = text.split(/(?:!)?\[.*?\]\(.*?\)/g);
    // Find all matches to extract the URLs
    const matches = Array.from(text.matchAll(/(?:!)?\[(.*?)\]\((.*?)\)/g));
    
    const result = [];
    parts.forEach((part, i) => {
      // Split text by newlines so they render correctly
      const textNodes = part.split('\n').map((line, j) => (
        <span key={`text-${i}-${j}`}>
          {line}
          {j !== part.split('\n').length - 1 && <br />}
        </span>
      ));
      result.push(...textNodes);
      
      if (matches[i]) {
        const alt = matches[i][1];
        let url = matches[i][2];
        
        if (url.includes(' ')) {
          url = encodeURI(url);
        }

        if (url.includes('pollinations.ai') || url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
          result.push(
            <img 
              key={`img-${i}`} 
              src={url} 
              alt={alt} 
              className="chat-generated-image" 
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          );
        } else {
          result.push(
            <a key={`link-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="chat-link">
              {alt || url}
            </a>
          );
        }
      }
    });
    
    return result.length > 0 ? result : text;
  };

  return (
    <motion.div
      className={`chat-bubble-wrapper ${isUser ? 'user' : 'ai'} ${groupClass}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {!isUser && (
        <div className="chat-avatar" style={{ opacity: isLastInGroup ? 1 : 0, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
          <img src="./images/companion-4.jpg" alt={aiName || 'Chance'} />
        </div>
      )}
      
      {isUser && (
        <div className="bubble-actions">
          <button className="bubble-reply-btn" onClick={onReply} title="Reply">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          </button>
        </div>
      )}

      <div className={`chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
        {!isUser && isFirstInGroup && <span className="bubble-sender">{aiName || 'Chance'}</span>}
        
        {replyTo && (
          <div className="bubble-reply-preview">
            <span className="reply-preview-sender">{replyTo.sender}</span>
            <span className="reply-preview-text">{replyTo.text}</span>
          </div>
        )}

        <div className="bubble-text">{renderMessageWithImages(message)}</div>
        <div className="bubble-meta">
          <span className="bubble-time">{time}</span>
          {isUser && <span className="read-ticks">✓✓</span>}
        </div>
      </div>

      {!isUser && (
        <div className="bubble-actions">
          <button className="bubble-reply-btn" onClick={onReply} title="Reply">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}
