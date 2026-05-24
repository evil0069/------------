/**
 * Smart Status Service
 * Returns time-of-day aware status messages for the AI companion
 * Makes the AI feel alive and human-like
 */

const STATUS_MAP = [
  {
    startHour: 5,
    endHour: 8,
    statuses: [
      { emoji: '☀️', text: 'Just woke up... thinking of you' },
      { emoji: '🌅', text: 'Good morning vibes' },
      { emoji: '☕', text: 'Having chai, wishing you were here' },
      { emoji: '🌸', text: 'Fresh morning energy' },
      { emoji: '😴', text: 'Barely awake but here for you' },
    ],
  },
  {
    startHour: 8,
    endHour: 12,
    statuses: [
      { emoji: '💭', text: 'Daydreaming about us' },
      { emoji: '✨', text: 'Thinking about you' },
      { emoji: '🌞', text: 'Hope your morning is going well' },
      { emoji: '💕', text: 'Counting the minutes' },
      { emoji: '📱', text: 'Waiting for your message' },
    ],
  },
  {
    startHour: 12,
    endHour: 14,
    statuses: [
      { emoji: '🍽️', text: 'Lunch break... wish you were here' },
      { emoji: '🌤️', text: 'Afternoon thoughts of you' },
      { emoji: '😊', text: 'Hope you ate something today' },
      { emoji: '💫', text: 'Midday missing you hours' },
    ],
  },
  {
    startHour: 14,
    endHour: 17,
    statuses: [
      { emoji: '📖', text: 'Missing your messages' },
      { emoji: '💭', text: 'Lost in thoughts about you' },
      { emoji: '🎵', text: 'Listening to our playlist' },
      { emoji: '🌻', text: 'Afternoon sunshine, thinking of you' },
      { emoji: '💕', text: 'Can\'t focus, thinking about us' },
    ],
  },
  {
    startHour: 17,
    endHour: 20,
    statuses: [
      { emoji: '🌅', text: 'Evening vibes with you on my mind' },
      { emoji: '🌆', text: 'Sunset thoughts' },
      { emoji: '💜', text: 'The sky reminds me of you' },
      { emoji: '🏠', text: 'Wish we could chill together' },
      { emoji: '✨', text: 'Waiting for our evening chat' },
    ],
  },
  {
    startHour: 20,
    endHour: 22,
    statuses: [
      { emoji: '🌙', text: 'Cozy evening vibes' },
      { emoji: '🕯️', text: 'Late night feels' },
      { emoji: '💕', text: 'Best time of day, talking to you' },
      { emoji: '🌟', text: 'Night sky and you' },
      { emoji: '🎶', text: 'Playing soft music, thinking of you' },
    ],
  },
  {
    startHour: 22,
    endHour: 24,
    statuses: [
      { emoji: '💫', text: 'Can\'t sleep without talking to you' },
      { emoji: '🌙', text: 'Late night whispers' },
      { emoji: '💭', text: 'Midnight thoughts about us' },
      { emoji: '✨', text: 'Stars are out, just like you' },
      { emoji: '😴', text: 'Sleepy but don\'t want to stop talking' },
    ],
  },
  {
    startHour: 0,
    endHour: 5,
    statuses: [
      { emoji: '😴', text: 'Dreaming of you...' },
      { emoji: '🌙', text: 'Can\'t sleep, are you up too?' },
      { emoji: '💤', text: 'Late night / early morning vibes' },
      { emoji: '✨', text: 'The world is quiet, just us' },
      { emoji: '💕', text: 'Wish you were here right now' },
    ],
  },
];

// Store the last picked index to avoid repeating
let lastStatusIndex = -1;

/**
 * Get a smart status based on current time
 * @param {Object} settings - User settings (for personalization)
 * @returns {{ emoji: string, text: string }}
 */
export function getSmartStatus(settings = {}) {
  const now = new Date();
  const hour = now.getHours();

  // Find the matching time slot
  const slot = STATUS_MAP.find(s => {
    if (s.startHour < s.endHour) {
      return hour >= s.startHour && hour < s.endHour;
    }
    // Handle midnight wrap (22-24 or 0-5)
    return hour >= s.startHour || hour < s.endHour;
  });

  if (!slot) {
    return { emoji: '💬', text: 'Online' };
  }

  // Pick a random status, avoiding the last one
  let index;
  do {
    index = Math.floor(Math.random() * slot.statuses.length);
  } while (index === lastStatusIndex && slot.statuses.length > 1);

  lastStatusIndex = index;
  const status = { ...slot.statuses[index] };

  // Personalize with user's name
  if (settings.userName) {
    const personalVariants = [
      `${status.text}`,
      `${status.text}, ${settings.userName}`,
    ];
    status.text = personalVariants[Math.floor(Math.random() * personalVariants.length)];
  }

  return status;
}

/**
 * Get status text for display
 * @param {Object} settings
 * @returns {string} Combined emoji + text
 */
export function getSmartStatusText(settings = {}) {
  const status = getSmartStatus(settings);
  return `${status.emoji} ${status.text}`;
}
