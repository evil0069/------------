/**
 * Stats Service — Calculates relationship stats from Firestore data
 * XP system, streak tracking, mood trends, message counts
 */

/**
 * Calculate the current streak (consecutive days with at least 1 message)
 * @param {Array} messages - All messages sorted by timestamp ascending
 * @returns {number} Streak in days
 */
export function calculateStreak(messages) {
  if (!messages || messages.length === 0) return 0;

  // Get unique days with messages
  const days = new Set();
  messages.forEach(msg => {
    if (msg.timestamp) {
      const date = new Date(msg.timestamp);
      days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    }
  });

  const sortedDays = Array.from(days)
    .map(d => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m, day);
    })
    .sort((a, b) => b - a); // Most recent first

  if (sortedDays.length === 0) return 0;

  // Check if most recent day is today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastDay = new Date(sortedDays[0]);
  lastDay.setHours(0, 0, 0, 0);

  if (lastDay < yesterday) return 0; // Streak broken

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const current = new Date(sortedDays[i - 1]);
    current.setHours(0, 0, 0, 0);
    const prev = new Date(sortedDays[i]);
    prev.setHours(0, 0, 0, 0);

    const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate total XP
 * @param {number} totalMessages - Total message count
 * @param {number} streak - Current streak in days
 * @returns {number} Total XP
 */
export function calculateXP(totalMessages, streak) {
  const messageXP = totalMessages * 10;
  const streakBonus = streak * 50;
  return messageXP + streakBonus;
}

/**
 * Calculate level from XP
 * @param {number} xp - Total XP
 * @returns {{ level: number, currentXP: number, nextLevelXP: number, progress: number }}
 */
export function calculateLevel(xp) {
  const level = Math.floor(Math.sqrt(xp / 100));
  const currentLevelXP = level * level * 100;
  const nextLevelXP = (level + 1) * (level + 1) * 100;
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return {
    level: Math.max(1, level),
    currentXP: xp - currentLevelXP,
    nextLevelXP: nextLevelXP - currentLevelXP,
    progress: Math.min(Math.max(progress, 0), 100),
  };
}

/**
 * Calculate time spent chatting (rough estimate)
 * @param {Array} messages - All messages
 * @returns {string} Formatted time string
 */
export function calculateTimeTogether(messages) {
  if (!messages || messages.length === 0) return '0m';

  // Estimate ~30 seconds per message exchange
  const totalMinutes = Math.round((messages.length * 30) / 60);

  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Get mood distribution from messages (requires mood data saved on messages)
 * @param {Array} messages - Messages with optional mood field
 * @returns {Object} Mood name -> count mapping
 */
export function getMoodDistribution(messages) {
  const distribution = {};
  messages.forEach(msg => {
    if (msg.mood) {
      distribution[msg.mood] = (distribution[msg.mood] || 0) + 1;
    }
  });
  return distribution;
}

/**
 * Get relationship title based on level
 * @param {number} level
 * @returns {string}
 */
export function getRelationshipTitle(level) {
  if (level >= 50) return '💎 Soulmates';
  if (level >= 40) return '👑 Royal Couple';
  if (level >= 30) return '🔥 Inseparable';
  if (level >= 25) return '💕 Deeply Connected';
  if (level >= 20) return '❤️ In Love';
  if (level >= 15) return '💗 Growing Bond';
  if (level >= 10) return '🌹 Close';
  if (level >= 5) return '✨ Getting Closer';
  if (level >= 2) return '🌱 Budding';
  return '🤝 Just Met';
}

/**
 * Calculate all stats at once
 * @param {Array} allMessages - All messages across all conversations
 * @returns {Object} Complete stats object
 */
export function calculateAllStats(allMessages) {
  const totalMessages = allMessages.length;
  const userMessages = allMessages.filter(m => m.role === 'user').length;
  const aiMessages = allMessages.filter(m => m.role === 'ai').length;
  const streak = calculateStreak(allMessages);
  const xp = calculateXP(totalMessages, streak);
  const levelInfo = calculateLevel(xp);
  const timeTogether = calculateTimeTogether(allMessages);
  const moodDistribution = getMoodDistribution(allMessages);
  const title = getRelationshipTitle(levelInfo.level);

  return {
    totalMessages,
    userMessages,
    aiMessages,
    streak,
    xp,
    ...levelInfo,
    timeTogether,
    moodDistribution,
    title,
  };
}
