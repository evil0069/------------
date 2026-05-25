/**
 * Audio Service
 * Uses browser-native Web Audio API to synthesize telephone sound effects (100% free, no audio files required).
 */

let audioCtx = null;
let ringInterval = null;
let ringOsc1 = null;
let ringOsc2 = null;
let ringGain = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a realistic telephone ringtone (440Hz + 480Hz mixed) looping every 5 seconds.
 */
export function playRingtone() {
  const ctx = getAudioContext();
  stopRingtone(); // ensure clean state

  const triggerRing = () => {
    try {
      const now = ctx.currentTime;
      
      // Create oscillators for US-standard ring tone combination
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 440; // 440 Hz
      
      osc2.type = 'sine';
      osc2.frequency.value = 480; // 480 Hz

      gainNode.gain.setValueAtTime(0, now);
      // Fade in slightly
      gainNode.gain.linearRampToValueAtTime(0.06, now + 0.05);
      // Ring lasts 2 seconds
      gainNode.gain.setValueAtTime(0.06, now + 1.8);
      // Fade out
      gainNode.gain.linearRampToValueAtTime(0, now + 2.0);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);

      // Keep references to abort if stopRingtone is called during active ring
      ringOsc1 = osc1;
      ringOsc2 = osc2;
      ringGain = gainNode;
    } catch (err) {
      console.warn("Failed to generate ringtone beep:", err);
    }
  };

  // Ring immediately
  triggerRing();

  // Loop every 5 seconds (2 seconds ring + 3 seconds pause)
  ringInterval = setInterval(triggerRing, 5000);
}

/**
 * Stops the active telephone ringtone loop and silences ongoing oscillators immediately.
 */
export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  
  // Abruptly kill active oscillators
  try {
    if (ringGain && audioCtx) {
      ringGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    if (ringOsc1) { ringOsc1.stop(); ringOsc1 = null; }
    if (ringOsc2) { ringOsc2.stop(); ringOsc2 = null; }
  } catch (e) {}
}

/**
 * Plays a quick, pleasant rising connection chime (E5 -> G5) to signal call success.
 */
export function playConnectChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    
    // E5 Note (659Hz) then G5 Note (784Hz)
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.12);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gainNode.gain.setValueAtTime(0.08, now + 0.25);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn("Failed to generate connect chime:", err);
  }
}

/**
 * Plays a short, descending frequency sweep beep (C4 -> G3) to signal call disconnection.
 */
export function playDisconnectBeep() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep from C4 (261Hz) down to G3 (196Hz)
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.exponentialRampToValueAtTime(196.00, now + 0.25);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gainNode.gain.setValueAtTime(0.1, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.28);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch (err) {
    console.warn("Failed to generate disconnect beep:", err);
  }
}
