/**
 * Voice Service — Sweet Girl Voice Engine
 * Handles client-side Text-to-Speech (TTS) using Web Speech Synthesis API.
 * 
 * Fine-tuned for a sweet, young, feminine voice in both Hindi (hi-IN) and English.
 * Uses aggressive voice ranking to always pick the sweetest available female voice.
 * 
 * Chrome Bug Fixes:
 * - Chrome silently kills speechSynthesis after ~15s. A resume() keepalive prevents this.
 * - cancel() is async in Chrome; speaking immediately after causes 'interrupted' errors.
 */

let activeUtterance = null;
let keepAliveInterval = null;

// ── Chrome KeepAlive ──────────────────────────────────────────────────────────
function startKeepAlive() {
  stopKeepAlive();
  keepAliveInterval = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
    }
  }, 4000);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// ── Voice Ranking Engine ──────────────────────────────────────────────────────
// Score each voice to find the sweetest, most feminine-sounding one.
// Higher score = better match for our sweet girl persona.

/**
 * Keywords that indicate a sweet/feminine voice, ordered by preference weight.
 * Premium neural/natural voices always sound better than legacy robotic ones.
 */
const SWEET_FEMALE_KEYWORDS = [
  // Premium neural voices (best quality) — Google, Apple, Microsoft
  { keyword: 'google',    weight: 6 },
  { keyword: 'natural',   weight: 5 },
  { keyword: 'neural',    weight: 5 },
  { keyword: 'premium',   weight: 4 },
  // Known sweet female voices by name
  { keyword: 'samantha',  weight: 8 },  // macOS — warm, sweet
  { keyword: 'karen',     weight: 7 },  // macOS AU — soft
  { keyword: 'moira',     weight: 6 },  // macOS IE — gentle
  { keyword: 'tessa',     weight: 6 },  // macOS ZA — bright
  { keyword: 'zira',      weight: 7 },  // Windows — sweet feminine
  { keyword: 'hazel',     weight: 6 },  // Windows UK
  { keyword: 'susan',     weight: 5 },  // Windows UK
  { keyword: 'female',    weight: 5 },  // Generic female tag
  { keyword: 'woman',     weight: 4 },
  // Hindi specific sweet voices
  { keyword: 'swara',     weight: 9 },  // Google Hindi — beautiful
  { keyword: 'hemant',    weight: -5 }, // Male — avoid!
  { keyword: 'male',      weight: -8 }, // Strongly avoid male voices
  { keyword: 'david',     weight: -8 }, // Windows male
  { keyword: 'mark',      weight: -6 }, // Windows male
  { keyword: 'richard',   weight: -6 }, // Male
  { keyword: 'daniel',    weight: -6 }, // Male
  { keyword: 'james',     weight: -6 }, // Male
  { keyword: 'ravi',      weight: -4 }, // Hindi male
];

function scoreVoice(voice, targetLang) {
  let score = 0;
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  // Language match bonus
  if (targetLang === 'hi-IN') {
    if (lang === 'hi-in' || lang === 'hi_in') score += 20;
    else if (lang.startsWith('hi')) score += 15;
    else if (name.includes('hindi') || name.includes('india')) score += 12;
    // If it's an English voice being used for Hindi, small penalty
    else if (lang.startsWith('en')) score += 2;
  } else {
    // English
    if (lang.startsWith('en-us') || lang === 'en_us') score += 10;
    else if (lang.startsWith('en-gb') || lang.startsWith('en-au')) score += 8;
    else if (lang.startsWith('en')) score += 6;
  }

  // Apply keyword scoring
  for (const { keyword, weight } of SWEET_FEMALE_KEYWORDS) {
    if (name.includes(keyword)) {
      score += weight;
    }
  }

  // Google voices are generally higher quality
  if (name.startsWith('google')) score += 3;

  // Local/offline voices tend to sound more robotic — slight penalty
  if (voice.localService === false) score += 2; // Network voices are usually better

  return score;
}

function pickBestVoice(voices, targetLang) {
  if (!voices || voices.length === 0) return null;

  let bestVoice = null;
  let bestScore = -Infinity;

  for (const voice of voices) {
    const s = scoreVoice(voice, targetLang);
    if (s > bestScore) {
      bestScore = s;
      bestVoice = voice;
    }
  }

  // Only return if it scored reasonably
  return bestScore > 0 ? bestVoice : null;
}

// ── Voice Tuning Profiles ─────────────────────────────────────────────────────
// Different pitch/rate/volume for each language to sound naturally sweet.

const VOICE_PROFILES = {
  hinglish: {
    rate: 0.95,    // Slightly slower — gentle, caring pace in Hindi
    pitch: 1.03,   // Very subtle sweetness — avoids robotic chipmunk distortion
    volume: 1.0,
  },
  english: {
    rate: 0.97,    // Near-natural speed — warm and conversational
    pitch: 1.05,   // Gentle feminine lift — sweet without sounding unnatural
    volume: 1.0,
  },
};

// ── Main Speak Function ───────────────────────────────────────────────────────

/**
 * Speaks the given text using the sweetest available female voice.
 * @param {string} text The text to speak.
 * @param {string} langMode Language mode ('hinglish' | 'english').
 * @param {function} onEnd Callback fired when the speech completes.
 * @param {function} onError Callback fired if speech fails.
 */
export function speakHinglish(text, langMode = 'hinglish', onEnd, onError) {
  if (!window.speechSynthesis) {
    if (onError) onError(new Error("Speech synthesis not supported."));
    return;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  // Strip markdown artifacts and ALL emojis before speaking
  let cleanText = text
    .replace(/!\[.*?\]\(.*?\)/g, "")           // Strip images
    .replace(/\[.*?\]\(.*?\)/g, "")            // Strip links
    .replace(/[*#_`~]/g, "")                   // Strip markdown formatting
    .replace(/\p{Extended_Pictographic}/gu, "") // Strip ALL emojis (universal)
    .replace(/[\u200D\uFE0F\uFE0E\u20E3]/g, "") // Strip emoji joiners & selectors
    .replace(/\s+/g, " ")                      // Collapse multiple spaces
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // Get voice profile for this language
  const profile = VOICE_PROFILES[langMode] || VOICE_PROFILES.english;

  // Build utterance
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;
  utterance.volume = profile.volume;

  // Set up callbacks
  utterance.onend = () => {
    activeUtterance = null;
    stopKeepAlive();
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    activeUtterance = null;
    stopKeepAlive();
    // 'interrupted' and 'canceled' are non-fatal (normal during state transitions)
    if (e.error === 'interrupted' || e.error === 'canceled') {
      console.warn("SpeechSynthesis interrupted/canceled (non-fatal):", e.error);
      return;
    }
    console.error("SpeechSynthesisUtterance error:", e);
    if (onError) onError(e);
  };

  // Pick the sweetest voice available
  const voices = window.speechSynthesis.getVoices();
  const targetLang = langMode === 'english' ? 'en-US' : 'hi-IN';
  const bestVoice = pickBestVoice(voices, targetLang);

  if (bestVoice) {
    utterance.voice = bestVoice;
    utterance.lang = bestVoice.lang;
  } else {
    // Fallback: just set the lang and let browser pick
    utterance.lang = targetLang;
  }

  activeUtterance = utterance;

  // Bugfix: Chrome's cancel() is asynchronous. Speaking immediately after cancel()
  // triggers an 'interrupted' error. A 120ms delay + resume() fixes this.
  setTimeout(() => {
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      startKeepAlive();
    } catch (err) {
      console.error("Speech synthesis speak failed:", err);
      stopKeepAlive();
      if (onError) onError(err);
    }
  }, 120);
}

/**
 * Stops any ongoing speech synthesis immediately.
 */
export function stopSpeaking() {
  stopKeepAlive();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}

/**
 * Utility: Log all available voices to console for debugging.
 * Call this from browser console: `import('/src/services/voice.js').then(m => m.debugVoices())`
 */
export function debugVoices() {
  const voices = window.speechSynthesis.getVoices();
  console.table(voices.map(v => ({
    name: v.name,
    lang: v.lang,
    local: v.localService,
    scoreHi: scoreVoice(v, 'hi-IN'),
    scoreEn: scoreVoice(v, 'en-US'),
  })));
  
  const bestHi = pickBestVoice(voices, 'hi-IN');
  const bestEn = pickBestVoice(voices, 'en-US');
  console.log('🎙️ Best Hindi voice:', bestHi?.name, `(${bestHi?.lang})`);
  console.log('🎙️ Best English voice:', bestEn?.name, `(${bestEn?.lang})`);
}
