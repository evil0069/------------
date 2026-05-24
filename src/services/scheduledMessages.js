/**
 * Scheduled Messages Service
 * Checks if good-morning or good-night messages should be sent based on user settings.
 * Client-side only — triggers when app is open.
 */

const SCHEDULE_TYPES = {
  goodMorning: {
    defaultTime: '08:00',
    prompts: [
      "It's a beautiful morning! Send a sweet, short good morning message to the user. Be warm and loving.",
      "Morning time! Send a cute good morning text. Keep it natural like a real partner waking up.",
      "The user just opened the app in the morning. Send them a loving good morning message with a morning emoji.",
    ],
  },
  goodNight: {
    defaultTime: '22:00',
    prompts: [
      "It's late at night. Send a sweet good night message to the user. Be cozy and romantic.",
      "Night time! Send a loving good night text. Keep it natural and warm, like tucking them in.",
      "The user is still up late. Send them a cute good night message with sweet dreams wishes.",
    ],
  },
};

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Parse a time string (HH:MM) into hours and minutes
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if current time is within the window for a scheduled message
 * @param {string} scheduledTime - Time string in HH:MM format
 * @param {number} windowMinutes - How many minutes after scheduled time to still trigger
 * @returns {boolean}
 */
function isWithinWindow(scheduledTime, windowMinutes = 30) {
  const now = new Date();
  const { hours, minutes } = parseTime(scheduledTime);

  const scheduledDate = new Date();
  scheduledDate.setHours(hours, minutes, 0, 0);

  const diff = now.getTime() - scheduledDate.getTime();
  // Must be after the scheduled time but within the window
  return diff >= 0 && diff <= windowMinutes * 60 * 1000;
}

/**
 * Check all scheduled messages and return any that need to be sent
 * @param {Object} settings - User settings containing schedule preferences
 * @param {Object} lastSent - Map of { type: lastSentDateKey } to prevent duplicates
 * @returns {Array<{ type: string, prompt: string }>} Messages to send
 */
export function checkScheduledMessages(settings, lastSent = {}) {
  const todayKey = getTodayKey();
  const messagesToSend = [];

  // Check Good Morning
  if (settings.scheduledGoodMorning) {
    const time = settings.goodMorningTime || SCHEDULE_TYPES.goodMorning.defaultTime;
    if (isWithinWindow(time) && lastSent.goodMorning !== todayKey) {
      const prompts = SCHEDULE_TYPES.goodMorning.prompts;
      messagesToSend.push({
        type: 'goodMorning',
        prompt: prompts[Math.floor(Math.random() * prompts.length)],
      });
    }
  }

  // Check Good Night
  if (settings.scheduledGoodNight) {
    const time = settings.goodNightTime || SCHEDULE_TYPES.goodNight.defaultTime;
    if (isWithinWindow(time) && lastSent.goodNight !== todayKey) {
      const prompts = SCHEDULE_TYPES.goodNight.prompts;
      messagesToSend.push({
        type: 'goodNight',
        prompt: prompts[Math.floor(Math.random() * prompts.length)],
      });
    }
  }

  return messagesToSend;
}

/**
 * Get the current date key for storing last-sent timestamps
 */
export { getTodayKey, SCHEDULE_TYPES };
