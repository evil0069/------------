/**
 * Browser Notification Service
 * Uses the Notification API to alert users when AI sends a message
 * Only triggers when the tab is not focused
 */

/**
 * Request notification permission from the user
 * @returns {Promise<string>} Permission state: 'granted', 'denied', or 'default'
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Get current notification permission status
 * @returns {string} 'granted', 'denied', 'default', or 'unsupported'
 */
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Send a browser notification (only when tab is hidden)
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} options - Additional options
 * @returns {Notification|null}
 */
export function sendNotification(title, body, options = {}) {
  // Only send notification when tab is not focused
  if (!document.hidden) return null;

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: body.length > 100 ? body.substring(0, 100) + '...' : body,
      icon: options.icon || '/images/companion-4.jpg',
      badge: '/images/companion-4.jpg',
      tag: options.tag || 'chance-ai-message',
      renotify: true,
      silent: false,
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus the tab when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error('Notification error:', err);
    return null;
  }
}

/**
 * Send a message notification for an AI response
 * @param {string} aiName - The AI companion's name
 * @param {string} messageText - The message text
 */
export function notifyNewMessage(aiName, messageText) {
  // Strip markdown image tags from preview
  const cleanText = messageText.replace(/!\[.*?\]\(.*?\)/g, '📷 Photo').trim();
  sendNotification(
    `${aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'} sent a message`,
    cleanText,
    { tag: 'chance-ai-message' }
  );
}
