/**
 * Mood/Emotion Detector — Client-side keyword-based sentiment analysis
 * Returns mood + emoji + color overlay for the chat background
 */

const MOOD_KEYWORDS = {
  romantic: {
    words: ['love', 'heart', 'darling', 'baby', 'sweetheart', 'forever', 'kiss', 'hug', 'miss you',
      'beautiful', 'gorgeous', 'pyaar', 'ishq', 'mohabbat', 'jaanu', 'jaan', 'dil', 'soulmate',
      'cuddle', 'embrace', 'adore', 'cherish', 'beloved', 'dream', 'together', 'always'],
    emoji: '💕',
    label: 'Romantic',
    color: 'rgba(255, 70, 130, 0.12)',
    glow: 'rgba(255, 70, 130, 0.3)',
  },
  happy: {
    words: ['happy', 'joy', 'glad', 'amazing', 'wonderful', 'great', 'awesome', 'fantastic',
      'smile', 'laugh', 'haha', 'lol', '😊', '😄', '🥳', 'yay', 'excited', 'celebrate',
      'khush', 'mast', 'maza', 'party', 'fun', 'blessed', 'grateful', 'perfect'],
    emoji: '😊',
    label: 'Happy',
    color: 'rgba(255, 193, 7, 0.1)',
    glow: 'rgba(255, 193, 7, 0.25)',
  },
  sad: {
    words: ['sad', 'cry', 'tears', 'hurt', 'pain', 'lonely', 'alone', 'miss', 'broken',
      'sorry', 'depressed', 'upset', 'worried', 'anxious', 'scared', 'afraid',
      'dukhi', 'rona', 'tanha', 'akela', 'dard', 'takleef', 'gham'],
    emoji: '😢',
    label: 'Sad',
    color: 'rgba(30, 136, 229, 0.1)',
    glow: 'rgba(30, 136, 229, 0.25)',
  },
  angry: {
    words: ['angry', 'mad', 'furious', 'hate', 'annoyed', 'frustrated', 'irritated',
      'rage', 'pissed', 'gussa', 'naraz', 'stupid', 'worst', 'terrible', 'awful'],
    emoji: '😤',
    label: 'Angry',
    color: 'rgba(244, 67, 54, 0.1)',
    glow: 'rgba(244, 67, 54, 0.3)',
  },
  flirty: {
    words: ['flirt', 'wink', 'tease', 'naughty', 'cute', 'hot', 'sexy', 'attractive',
      'blush', 'shy', 'sharam', 'sundar', 'pataka', 'cheeks', 'eyes', 'lips',
      '😏', '😘', '😍', '🥰', 'crush', 'butterflies'],
    emoji: '😏',
    label: 'Flirty',
    color: 'rgba(233, 30, 99, 0.1)',
    glow: 'rgba(233, 30, 99, 0.3)',
  },
  calm: {
    words: ['calm', 'peace', 'relax', 'chill', 'quiet', 'serene', 'gentle', 'soft',
      'cozy', 'comfortable', 'safe', 'warm', 'sukoon', 'chain', 'aram',
      'breathe', 'meditate', 'sleep', 'rest', 'soothing'],
    emoji: '😌',
    label: 'Calm',
    color: 'rgba(156, 136, 255, 0.08)',
    glow: 'rgba(156, 136, 255, 0.2)',
  },
  excited: {
    words: ['excited', 'omg', 'wow', 'insane', 'crazy', 'unbelievable', 'incredible',
      'fire', '🔥', '⚡', 'epic', 'legendary', 'mind-blown', 'shocked',
      'surprise', 'whoa', 'damn', 'pagal', 'dhamaka'],
    emoji: '🤩',
    label: 'Excited',
    color: 'rgba(189, 0, 255, 0.1)',
    glow: 'rgba(189, 0, 255, 0.3)',
  },
};

const DEFAULT_MOOD = {
  name: 'neutral',
  emoji: '💬',
  label: 'Chatting',
  color: 'transparent',
  glow: 'transparent',
  confidence: 0,
};

/**
 * Detect mood from text using keyword matching
 * @param {string} text - The text to analyze
 * @returns {{ name: string, emoji: string, label: string, color: string, glow: string, confidence: number }}
 */
export function detectMood(text) {
  if (!text || typeof text !== 'string') return DEFAULT_MOOD;

  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [mood, config] of Object.entries(MOOD_KEYWORDS)) {
    let score = 0;
    for (const word of config.words) {
      // Count occurrences of each keyword
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > 0) {
      scores[mood] = score;
    }
  }

  // Find the mood with the highest score
  let topMood = null;
  let topScore = 0;

  for (const [mood, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topMood = mood;
    }
  }

  if (!topMood || topScore === 0) return DEFAULT_MOOD;

  const config = MOOD_KEYWORDS[topMood];
  const confidence = Math.min(topScore / 3, 1); // Normalize to 0-1

  return {
    name: topMood,
    emoji: config.emoji,
    label: config.label,
    color: config.color,
    glow: config.glow,
    confidence,
  };
}

export { MOOD_KEYWORDS, DEFAULT_MOOD };
