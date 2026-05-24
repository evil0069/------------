import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';


/**
 * ChatBubble — Instagram DM style message bubble
 * Features: double-tap heart, TTS, reactions display, sticker rendering, vanish tags, interactive polls.
 */
export default function ChatBubble({
  message, isUser, timestamp, aiName, isFirstInGroup, isLastInGroup,
  replyTo, onReply, reactions, onReact, onLongPress, messageType,
  vanish, pollData, onVote, currentUserId
}) {
  const [hearted, setHearted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef(null);

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const groupClass = isFirstInGroup && isLastInGroup
    ? 'group-single'
    : isFirstInGroup ? 'group-first'
    : isLastInGroup ? 'group-last'
    : 'group-middle';

  // Double-tap to heart
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setHearted(true);
      if (onReact) onReact('❤️');
    }
    lastTapRef.current = now;
  };

  // Long press for reactions
  const handleTouchStart = (e) => {
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches?.[0];
      if (onLongPress && touch) {
        onLongPress({ x: touch.clientX - 100, y: touch.clientY - 60 });
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  // Pre-warm Web Speech API voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Trigger voice retrieval to warm up cache
      window.speechSynthesis.getVoices();
      
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Text-to-Speech
  const handleSpeak = () => {
    if (!message || isUser) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    // Clean emojis, stickers, markdown images, and link URLs
    const cleanText = message
      .replace(/!\[.*?\]\(.*?\)/g, '') // Strip markdown images
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text, strip link URLs
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Component}]/gu, '') // Strip emojis
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Direct unicode range emoji fallback
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
      
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.90; // Natural, slightly relaxed cadence
    utterance.pitch = 1.05; // Softer, warmer pitch for comforting feminine tone

    const voices = window.speechSynthesis.getVoices();
    
    // Helper to identify female-sounding voices
    const isFemaleVoice = (v) => {
      const name = v.name.toLowerCase();
      return name.includes('female') || 
             name.includes('samantha') || 
             name.includes('zira') || 
             name.includes('kalpana') || 
             name.includes('heera') || 
             name.includes('veena') || 
             name.includes('lekha') || 
             name.includes('neerja') || 
             name.includes('swara') ||
             name.includes('hazel') ||
             name.includes('victoria') ||
             name.includes('susan') ||
             name.includes('karen') ||
             name.includes('moira') ||
             name.includes('tessa') ||
             name.includes('fiona') ||
             name.includes('aria');
    };

    // Helper to check for premium natural/online/neural signatures
    const isPremiumNeural = (v) => {
      const name = v.name.toLowerCase();
      return name.includes('natural') || name.includes('online') || name.includes('neural');
    };

    // Voice Selection Priority Hierarchy
    let chosenVoice = null;

    // Preference 1: Indian Female Neural/Natural Voice (Hindi hi-IN or English en-IN)
    chosenVoice = voices.find(v => 
      (v.lang.startsWith('hi') || v.lang.toLowerCase().includes('in')) && 
      isFemaleVoice(v) && 
      isPremiumNeural(v)
    );

    // Preference 2: Standard Indian Female Voice (Hindi/English India)
    if (!chosenVoice) {
      chosenVoice = voices.find(v => 
        (v.lang.startsWith('hi') || v.lang.toLowerCase().includes('in')) && 
        isFemaleVoice(v)
      );
    }

    // Preference 3: Any Premium Global Female Neural/Natural Voice (e.g. Aria Online)
    if (!chosenVoice) {
      chosenVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        isFemaleVoice(v) && 
        isPremiumNeural(v)
      );
    }

    // Preference 4: Any standard female English voice (Samantha, Zira, etc.)
    if (!chosenVoice) {
      chosenVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        isFemaleVoice(v)
      );
    }

    // Preference 5: Any Indian accent (fallback)
    if (!chosenVoice) {
      chosenVoice = voices.find(v => v.lang.toLowerCase().includes('in'));
    }

    // Preference 6: Standard Google English voice
    if (!chosenVoice) {
      chosenVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'));
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };


  // Render message content with image/link support
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Regex to match either ![alt](url) or [text](url)
    // Group 1: '!' if image, empty string if link
    // Group 2: alt text or link text
    // Group 3: url
    const regex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    const renderTextWithLineBreaks = (str, partIndex) => {
      return str.split('\n').map((line, j) => (
        <span key={`t-${partIndex}-${j}`}>
          {line}
          {j !== str.split('\n').length - 1 && <br />}
        </span>
      ));
    };

    while ((match = regex.exec(text)) !== null) {
      // Add preceding text if any
      const precedingText = text.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push(...renderTextWithLineBreaks(precedingText, lastIndex));
      }

      const isImage = match[1] === '!';
      const alt = match[2];
      let url = match[3].trim();
      if (url.includes(' ')) url = encodeURI(url);

      if (isImage || url.includes('pollinations.ai') || url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
        parts.push(
          <img
            key={`img-${match.index}`}
            src={url}
            alt={alt}
            className="chat-generated-image"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        );
      } else {
        parts.push(
          <a
            key={`link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-link"
          >
            {alt || url}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text if any
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(...renderTextWithLineBreaks(remainingText, lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Check if this is a sticker message
  const isSticker = messageType === 'sticker';
  const isPoll = messageType === 'poll';

  // Render Poll Component
  const renderPollCard = () => {
    if (!pollData) return null;
    const totalVotes = (pollData.options || []).reduce((acc, opt) => acc + (opt.votes ? opt.votes.length : 0), 0);

    return (
      <div className="poll-card">
        <h4 className="poll-question">{pollData.question}</h4>
        <div className="poll-options-list">
          {(pollData.options || []).map((option, idx) => {
            const votesList = option.votes || [];
            const hasVoted = votesList.includes(currentUserId);
            const aiVoted = votesList.includes('companion');
            const percentage = totalVotes > 0 ? Math.round((votesList.length / totalVotes) * 100) : 0;

            return (
              <div
                key={idx}
                className={`poll-option-container ${hasVoted ? 'voted' : ''}`}
                onClick={() => {
                  if (onVote) onVote(idx);
                }}
              >
                {/* Progress bar fill */}
                <motion.div
                  className="poll-option-progress"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <div className="poll-option-details">
                  <span className="poll-option-text" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    {option.text}
                    {hasVoted && <span className="poll-voted-checkmark">✓</span>}
                    {aiVoted && (
                      <span className="poll-ai-voted-tag" style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        background: 'rgba(236, 72, 153, 0.15)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        color: '#ff7ebb',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: '0 0 6px rgba(236, 72, 153, 0.1)'
                      }}>
                        💝 {aiName || 'Chance'}
                      </span>
                    )}
                  </span>
                  <span className="poll-option-votes">
                    {percentage}% ({votesList.length})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="poll-total-votes">
          Total votes: {totalVotes}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`chat-bubble-wrapper ${isUser ? 'user' : 'ai'} ${groupClass}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ position: 'relative' }}
    >
      {/* Swipe Reply indicator behind the bubble */}
      {!isSticker && (
        <div
          className="swipe-reply-indicator"
          style={{
            position: 'absolute',
            left: isUser ? '-28px' : '36px',
            alignSelf: 'center',
            opacity: 0.5,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 0
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--chat-accent, var(--primary))">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
        </div>
      )}

      {!isUser && (
        <div className="chat-avatar" style={{ opacity: isLastInGroup ? 1 : 0, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
          <img src="/images/companion-4.jpg" alt={aiName || 'Chance'} />
        </div>
      )}

      {isUser && (
        <div className="bubble-actions">
          <button className="bubble-reply-btn" onClick={onReply} title="Reply">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          </button>
        </div>
      )}

      <motion.div
        className={`chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'} ${isSticker ? 'sticker-bubble' : ''} ${isPoll ? 'poll-bubble' : ''}`}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onLongPress) onLongPress({ x: e.clientX - 100, y: e.clientY - 60 });
        }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.2}
        onDragEnd={(event, info) => {
          const dragDistance = info.offset.x;
          if (dragDistance > 50 && onReply) {
            onReply();
            if (window.navigator?.vibrate) window.navigator.vibrate(10);
          }
        }}
        style={{ zIndex: 1, cursor: 'grab', touchAction: 'pan-y' }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {vanish && (
          <div className="vanish-indicator-label">🤫 vanish mode</div>
        )}

        {!isUser && isFirstInGroup && !isSticker && (
          <span className="bubble-sender">{aiName || 'Chance'}</span>
        )}

        {replyTo && (
          <div className="bubble-reply-preview">
            <span className="reply-preview-sender">{replyTo.sender}</span>
            <span className="reply-preview-text">{replyTo.text}</span>
          </div>
        )}

        {isSticker ? (
          <div className="sticker-emoji-display">{message}</div>
        ) : isPoll ? (
          renderPollCard()
        ) : (
          <div className="bubble-text">{renderMessageContent(message)}</div>
        )}

        {!isSticker && (
          <div className="bubble-meta">
            {!isUser && !isPoll && (
              <button className={`tts-btn ${isSpeaking ? 'speaking' : ''}`} onClick={handleSpeak} title={isSpeaking ? 'Stop' : 'Listen'}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </button>
            )}
            <span className="bubble-time">{time}</span>
            {isUser && <span className="read-ticks">✓✓</span>}
          </div>
        )}

        {(hearted || (reactions && reactions.includes('❤️'))) && <span className="bubble-heart-reaction">❤️</span>}
      </motion.div>

      {/* Reaction display */}
      {reactions && reactions.length > 0 && (
        <div className="bubble-reactions">
          {reactions.map((r, i) => (
            <span key={i} className="bubble-reaction-item" onClick={() => onReact && onReact(r)}>{r}</span>
          ))}
        </div>
      )}

      {!isUser && (
        <div className="bubble-actions">
          <button className="bubble-reply-btn" onClick={onReply} title="Reply">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}
