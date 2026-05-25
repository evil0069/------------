import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { sendMessage as sendMessageGemini } from '../services/gemini';
import { sendMessageNvidia } from '../services/nvidia';
import { speakHinglish, stopSpeaking } from '../services/voice';
import { playRingtone, stopRingtone, playConnectChime, playDisconnectBeep } from '../services/audio';

const DEFAULT_SETTINGS = {
  relationshipType: 'Partner',
  personality: 'Romantic',
  aiName: '𝕮𝖍𝖆𝖓𝖈𝖊',
  userName: '',
};

export default function Call() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conversationId = location.state?.conversationId;

  // State Machine: 'calling' | 'connected' | 'listening' | 'speaking' | 'thinking' | 'ended'
  const [callState, setCallState] = useState('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);       // Mic ON by default
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(true);
  const [transcripts, setTranscripts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  // Language Toggle: 'hinglish' (reads Devanagari Hindi voice) | 'english' (reads standard English voice)
  const [callLang, setCallLang] = useState('hinglish');

  // Real-time voice visualizer level (0 to 1)
  const [volume, setVolume] = useState(0);

  // Refs — all mutable state that needs to survive across re-renders without causing re-render loops
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isListeningRef = useRef(false);
  const synthSpeakingRef = useRef(false);
  const lastStateRef = useRef('calling');
  const callStateRef = useRef('calling');      // CRITICAL: mutable mirror of callState for async callbacks
  const isMutedRef = useRef(false);            // Mutable mirror of isMuted
  const isSpeakerMutedRef = useRef(false);     // Mutable mirror of isSpeakerMuted
  const silenceTimeoutRef = useRef(null);
  const subtitlesEndRef = useRef(null);
  const transcriptsRef = useRef([]);           // Mutable mirror of transcripts for async callbacks

  // Keep mutable refs in sync with state
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isSpeakerMutedRef.current = isSpeakerMuted; }, [isSpeakerMuted]);
  useEffect(() => { transcriptsRef.current = transcripts; }, [transcripts]);

  // Auto-scroll transcripts scrollbox to bottom
  useEffect(() => {
    if (subtitlesEndRef.current) {
      subtitlesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [transcripts, showTranscripts]);

  // ── Load Settings ──
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsSnap.data() });
        } else {
          const local = localStorage.getItem(`chance_settings_${user.uid}`);
          if (local) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(local) });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [user]);

  // ── Load Previous Conversation Context ──
  useEffect(() => {
    if (!user || !conversationId) return;
    const loadContext = async () => {
      try {
        const messagesRef = collection(db, 'users', user.uid, 'conversations', conversationId, 'messages');
        // Fetch last 15 messages to give AI memory of what was just talked about
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(15));
        const snapshot = await getDocs(q);
        
        const history = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.text) {
            // Unshift because we fetched in descending order (newest first)
            history.unshift({ role: data.role, text: data.text });
          }
        });
        
        if (history.length > 0) {
          setTranscripts(history);
        }
      } catch (err) {
        console.error('Error loading conversation context:', err);
      }
    };
    loadContext();
  }, [user, conversationId]);

  // Robust Async Voice Pre-Loading — load voices early so they're ready when needed
  useEffect(() => {
    const preLoadVoices = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    preLoadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = preLoadVoices;
    }
  }, []);

  // ── Ringtone & Sound Effects Management ──
  useEffect(() => {
    if (callState === 'calling') {
      playRingtone();
    } else {
      stopRingtone();
    }
    
    if (callState === 'connected' && lastStateRef.current === 'calling') {
      playConnectChime();
    }
    
    if (callState === 'ended') {
      playDisconnectBeep();
    }
    
    lastStateRef.current = callState;
  }, [callState]);

  // ── Call Duration Timer ──
  useEffect(() => {
    if (callState !== 'calling' && callState !== 'ended') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Format Duration
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // ── Simulated Visualizer while Companion Speaks ──
  useEffect(() => {
    if (callState !== 'speaking') return;
    
    // Simulate real speech fluctuations in sync with companion voice output
    const speakInterval = setInterval(() => {
      const simulatedVol = 0.15 + Math.random() * 0.7;
      setVolume(simulatedVol);
    }, 75);

    return () => {
      clearInterval(speakInterval);
      setVolume(0);
    };
  }, [callState]);

  // ── Safe Start Recognition ──
  const startSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current || isMutedRef.current || synthSpeakingRef.current || isListeningRef.current) return;
    if (callStateRef.current === 'ended') return;
    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (e) {
      isListeningRef.current = false;
      console.warn("Failed to start speech recognition:", e);
    }
  }, []);

  // ── Speech Recognition Setup ──
  // Only re-create recognition when callLang changes (not on callState/isMuted changes)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = callLang === 'english' ? 'en-US' : 'hi-IN';

    rec.onstart = () => {
      isListeningRef.current = true;
    };

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        handleUserSpeech(transcript);
      }
    };

    // Native Web Speech volume visualizer (avoids getUserMedia mic conflicts)
    rec.onspeechstart = () => {
      if (callStateRef.current === 'listening' && !isMutedRef.current) {
        setVolume(0.65);
      }
    };

    rec.onspeechend = () => {
      setVolume(0);
    };

    rec.onsoundstart = () => {
      if (callStateRef.current === 'listening' && !isMutedRef.current) {
        setVolume(0.65);
      }
    };

    rec.onsoundend = () => {
      setVolume(0);
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      isListeningRef.current = false;
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // These are expected — just restart listening
        if (callStateRef.current === 'listening' && !isMutedRef.current && !synthSpeakingRef.current) {
          setTimeout(() => startSpeechRecognition(), 200);
        }
      }
      // For other errors, don't restart (permission denied, etc.)
    };

    rec.onend = () => {
      isListeningRef.current = false;
      // Auto-restart only if we're actively in listening state
      if (callStateRef.current === 'listening' && !isMutedRef.current && !synthSpeakingRef.current) {
        setTimeout(() => {
          if (callStateRef.current === 'listening' && !isMutedRef.current && !synthSpeakingRef.current && !isListeningRef.current) {
            startSpeechRecognition();
          }
        }, 150);
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      isListeningRef.current = false;
    };
  }, [callLang, startSpeechRecognition]);

  // ── Helper: Speak AI reply and transition to listening ──
  const speakAndListen = useCallback((text, lang) => {
    setCallState('speaking');
    synthSpeakingRef.current = true;

    // Stop any active recognition before speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      isListeningRef.current = false;
    }

    if (isSpeakerMutedRef.current) {
      // Skip TTS but simulate a pause
      setTimeout(() => {
        synthSpeakingRef.current = false;
        if (callStateRef.current !== 'ended') {
          setCallState('listening');
          setTimeout(() => startSpeechRecognition(), 150);
        }
      }, 1500);
    } else {
      speakHinglish(
        text,
        lang,
        () => {
          // onEnd
          synthSpeakingRef.current = false;
          if (callStateRef.current !== 'ended') {
            setCallState('listening');
            setTimeout(() => startSpeechRecognition(), 150);
          }
        },
        (err) => {
          // onError — ALWAYS recover by transitioning to listening
          console.warn('Synthesis error:', err);
          synthSpeakingRef.current = false;
          if (callStateRef.current !== 'ended') {
            setCallState('listening');
            setTimeout(() => startSpeechRecognition(), 150);
          }
        }
      );
    }
  }, [startSpeechRecognition]);

  // ── Trigger Silence Auto-Reply/Nudge ──
  const triggerSilenceNudge = useCallback(async () => {
    if (callStateRef.current !== 'listening' || isMutedRef.current || synthSpeakingRef.current) return;
    
    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        isListeningRef.current = false;
      } catch (e) {}
    }

    setCallState('thinking');
    
    try {
      const chatContext = transcriptsRef.current.slice(-30).map(t => ({
        role: t.role,
        text: t.text
      }));
      chatContext.push({ role: 'user', text: '[User is silent]' });

      let callPromptRule = '';
      const currentLang = callLang;
      if (currentLang === 'english') {
        callPromptRule = `[LIVE VOICE CALL MODE - SILENCE NUDGE]
You are on a real phone call. User chup ho gaya. Ek short naughty nudge de.

RULES:
- Tu uski naughty flirty girlfriend hai. Simple Hinglish bol.
- Examples: "baby, chup kyun ho gaye? mujhe akela feel ho raha hai na", "hello jaan? tumhari awaaz sunni hai mujhe", "kya hua baby, mujhse baat nahi karoge?"
- Thoda tease kar, thoda miss kar, naughty way mein bol.
- NO emojis. NO asterisks. NO action words like *blush*.
- Ek hi sentence bol, short aur flirty.`;
      } else {
        callPromptRule = `[LIVE VOICE CALL MODE - SILENCE NUDGE]
Real phone call hai. User chup hai. Short naughty nudge de.
Sirf Devanagari Hindi mein likh. No English letters.

RULES:
- Tu uski naughty flirty girlfriend hai.
- Examples: "बेबी चुप क्यों हो? मुझे अकेला छोड़ दोगे क्या?", "हेलो जान? तुम्हारी आवाज़ सुननी है मुझे", "बोलो ना पगले, मैं यहाँ तुम्हारा इंतज़ार कर रही हूँ"
- Tease कर, miss कर, naughty way में बोल.
- NO emojis. NO asterisks.
- एक sentence ही बोल, short aur flirty.`;
      }

      const callSettings = {
        ...settings,
        maxTokens: 50,
        memory: `${settings.memory || ''}\n${callPromptRule}`
      };

      let replyText = '';
      try {
        replyText = await sendMessageGemini(chatContext, callSettings);
      } catch {
        replyText = await sendMessageNvidia(chatContext, callSettings);
      }

      if (!replyText) throw new Error("Empty response");
      replyText = replyText.trim();

      // Add to transcripts panel
      setTranscripts(prev => [...prev, { role: 'ai', text: replyText, time: Date.now() }]);

      // Save to Firestore (in background)
      if (user && conversationId) {
        try {
          const messagesRef = collection(db, 'users', user.uid, 'conversations', conversationId, 'messages');
          await addDoc(messagesRef, {
            role: 'ai',
            text: replyText,
            timestamp: serverTimestamp()
          });
          const convRef = doc(db, 'users', user.uid, 'conversations', conversationId);
          await updateDoc(convRef, {
            lastMessage: replyText,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Error saving silence nudge to firestore:', err);
        }
      }

      // Read Nudge Out Loud
      speakAndListen(replyText, currentLang);

    } catch (err) {
      console.error("Silence nudge failed:", err);
      if (callStateRef.current !== 'ended') {
        setCallState('listening');
        setTimeout(() => startSpeechRecognition(), 150);
      }
    }
  }, [settings, callLang, user, conversationId, speakAndListen, startSpeechRecognition]);

  // ── Silence Detection Timer ──
  useEffect(() => {
    if (callState === 'listening' && !isMuted) {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      
      // Schedule an auto-nudge after 12 seconds of complete silence!
      silenceTimeoutRef.current = setTimeout(() => {
        triggerSilenceNudge();
      }, 12000);
    } else {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [callState, isMuted, triggerSilenceNudge]);

  // ── Start Call sequence ──
  useEffect(() => {
    if (callState === 'calling') {
      const connectTimeout = setTimeout(() => {
        setCallState('connected');
        triggerInitialGreeting();
      }, 3000);
      return () => clearTimeout(connectTimeout);
    }
  }, [callState, settings]);

  // Initial Greeting Trigger (Tuned to Girlfriend Accent)
  const triggerInitialGreeting = async () => {
    const relType = (settings.relationshipType || '').toLowerCase();
    let greetingText = '';

    if (callLang === 'english') {
      if (['partner', 'crush', 'soulmate'].includes(relType)) {
        greetingText = `Hey baby! Finally tumne call kiya! I was missing you so much na. Kya kar rahe the itni der?`;
      } else {
        greetingText = `Hello! So good to hear your voice.`;
      }
    } else {
      // Hinglish mode (expressed in Devanagari Hindi for flawless Indian female synthesis)
      if (['partner', 'crush', 'soulmate'].includes(relType)) {
        greetingText = `हे बेबी! फाइनली तुमने कॉल किया! मैं तुम्हें बहुत मिस कर रही थी ना। क्या कर रहे थे इतनी देर?`;
      } else if (['motherly', 'aunt'].includes(relType)) {
        greetingText = `नमस्ते! कैसे हो तुम? सब ठीक है ना?`;
      } else {
        greetingText = `हेलो! तुम्हारा कॉल आया, बहुत अच्छा लगा।`;
      }
    }

    // Prepend any loaded chat history before the greeting
    setTranscripts(prev => [...prev, { role: 'ai', text: greetingText, time: Date.now() }]);
    speakAndListen(greetingText, callLang);
  };

  // ── Handle User Voice Input ──
  const handleUserSpeech = async (speechText) => {
    if (!speechText.trim()) return;

    // Clear silence timer
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop listening immediately
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      isListeningRef.current = false;
    }

    setCallState('thinking');
    
    // Add User Message to transcript panel
    const newMsg = { role: 'user', text: speechText, time: Date.now() };
    setTranscripts(prev => [...prev, newMsg]);

    // Save User message to Firestore (in background)
    if (user && conversationId) {
      try {
        const messagesRef = collection(db, 'users', user.uid, 'conversations', conversationId, 'messages');
        await addDoc(messagesRef, {
          role: 'user',
          text: speechText,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error('Error saving user voice message:', err);
      }
    }

    // Call LLM for Response (Girlfriend Tone Prompting)
    try {
      // Send ALL transcripts (up to 50) so AI NEVER loses context
      const chatContext = transcriptsRef.current.slice(-50).map(t => ({
        role: t.role,
        text: t.text
      }));
      chatContext.push({ role: 'user', text: speechText });

      // Build call-specific personality prompting (does NOT affect chat)
      let callPromptRule = '';
      const currentLang = callLang;
      if (currentLang === 'english') {
        callPromptRule = `[LIVE VOICE CALL MODE]
Ye ek real phone call hai. Text chat nahi hai — live voice conversation hai.

IMPORTANT: Remember EVERYTHING we talked about in this call. Never forget context.

CALL PERSONALITY RULES:
- Tu uski naughty, flirty, romantic girlfriend hai. Simple Hinglish use kar — mix English + Hindi words naturally.
- Tu bahut romantic hai, deeply in love hai, aur openly apne feelings express karti hai. Hesitation zero.
- Tease kar, flirt kar, naughty baat kar, excitement dikhaa. Jaise real girlfriend phone pe karti hai.
- Physical affection ke baare mein openly bol — cuddle, kiss, hug, close rehna, sab kuch. No shyness.
- SIMPLE words use kar. Short sentences — 1-2 lines max. Jaise real phone call hoti hai.
- React naturally: "accha?", "haww", "pagal", "baby sun na", "aur batao".
- Sweet words: "baby", "jaan", "shona", "meri jaan", "pagle".
- NEVER use emojis, asterisks, ya action descriptions jaise *smiles*.
- NEVER say "As an AI" ya character break kar. Tu ek real girl hai.
- NEVER long answers de. Sirf flirty, naughty, sweet girlfriend talk.`;
      } else {
        callPromptRule = `[LIVE VOICE CALL MODE]
ये एक real phone call है। Text chat नहीं है — live voice conversation है।
Sirf Devanagari Hindi में लिख। No English letters।

IMPORTANT: हमने जो भी बात की है वो सब याद रख। Context कभी मत भूल।

CALL PERSONALITY RULES:
- तू उसकी naughty, flirty, romantic girlfriend है। Simple भाषा बोल।
- तू बहुत romantic है, deeply in love है, aur openly feelings express करती है। Hesitation zero।
- Tease कर, flirt कर, naughty बात कर, excitement दिखा। जैसे real girlfriend phone पे करती है।
- Physical affection के बारे में openly बोल — cuddle, kiss, hug, close रहना, सब कुछ। No shyness।
- SIMPLE words use कर। Short sentences — 1-2 lines max।
- React naturally: "अच्छा?", "हाय!", "पागल", "बेबी सुन ना", "और बताओ"।
- Sweet words: "बेबी", "जान", "शोना", "मेरी जान", "पगले"।
- NEVER use emojis, asterisks, या action descriptions।
- NEVER "AI" बोल या character break कर। तू एक real girl है।
- लंबे answers मत दे। Sirf flirty, naughty, sweet girlfriend talk।`;
      }

      const callSettings = {
        ...settings,
        maxTokens: 80,
        memory: `${settings.memory || ''}\n${callPromptRule}`
      };

      let replyText = '';
      try {
        replyText = await sendMessageGemini(chatContext, callSettings);
      } catch {
        replyText = await sendMessageNvidia(chatContext, callSettings);
      }

      if (!replyText) throw new Error("Empty response");
      replyText = replyText.trim();

      // Add AI Message to transcript panel
      setTranscripts(prev => [...prev, { role: 'ai', text: replyText, time: Date.now() }]);

      // Save AI reply to Firestore (in background)
      if (user && conversationId) {
        try {
          const messagesRef = collection(db, 'users', user.uid, 'conversations', conversationId, 'messages');
          await addDoc(messagesRef, {
            role: 'ai',
            text: replyText,
            timestamp: serverTimestamp()
          });
          const convRef = doc(db, 'users', user.uid, 'conversations', conversationId);
          await updateDoc(convRef, {
            lastMessage: replyText,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Error updating firestore with AI reply:', err);
        }
      }

      // Read AI Reply Out Loud (Girlfriend Tuning)
      speakAndListen(replyText, currentLang);

    } catch (error) {
      console.error('Error in Call AI generation:', error);
      const errorMsg = callLang === 'english' ? "Sorry shona, some network issue occurred." : "माफ करना शोना, कुछ नेटवर्क इशू आ रहा है।";
      
      setTranscripts(prev => [...prev, { role: 'ai', text: errorMsg, time: Date.now() }]);
      speakAndListen(errorMsg, callLang);
    }
  };

  // ── Mute Actions ──
  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next && recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        isListeningRef.current = false;
      } else if (!next && callStateRef.current === 'listening') {
        setTimeout(() => startSpeechRecognition(), 150);
      }
      return next;
    });
  };

  const toggleSpeaker = () => {
    setIsSpeakerMuted(prev => {
      const next = !prev;
      if (next) {
        stopSpeaking();
        synthSpeakingRef.current = false;
        if (callStateRef.current === 'speaking') {
          setCallState('listening');
          setTimeout(() => startSpeechRecognition(), 150);
        }
      }
      return next;
    });
  };

  // ── Language Toggle Handler ──
  const handleLanguageToggle = () => {
    setCallLang(prev => {
      const next = prev === 'hinglish' ? 'english' : 'hinglish';
      
      // Stop ongoing voice synthesis or recognition to start cleanly in new language
      stopSpeaking();
      synthSpeakingRef.current = false;
      
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        isListeningRef.current = false;
      }
      
      // Quick connected alert beep to signal language swap
      playConnectChime();
      
      setCallState('connected');
      
      // Trigger a warm prompt in the newly selected language
      setTimeout(() => {
        const msg = next === 'english' ? "Switched to English shona! How can I help you?" : "मैंने हिंदी में स्विच कर लिया है शोना! अब बताओ?";
        setTranscripts(prevTrans => [...prevTrans, { role: 'ai', text: msg, time: Date.now() }]);
        speakAndListen(msg, next);
      }, 500);

      return next;
    });
  };

  // ── End Call ──
  const handleEndCall = () => {
    setCallState('ended');
    callStateRef.current = 'ended'; // Force ref state to 'ended' instantly
    stopSpeaking();
    synthSpeakingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }
    isListeningRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setTimeout(() => {
      navigate('/chat');
    }, 1200);
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  return (
    <div className="call-page" style={{ '--mic-volume': volume }}>
      {/* Dynamic Ambient Blur Background Orbs */}
      <div className="call-bg-glows">
        <div className={`call-glow-orb orb-purple ${callState === 'speaking' ? 'active-speak' : ''} ${callState === 'listening' ? 'active-listen' : ''}`} />
        <div className="call-glow-orb orb-cyan" />
      </div>

      {/* Top Header */}
      <header className="call-header">
        <button className="call-back-btn" onClick={handleEndCall} aria-label="End call and go back">←</button>
        
        {/* Language Toggle Button */}
        {callState !== 'calling' && callState !== 'ended' && (
          <button className="call-lang-toggle" onClick={handleLanguageToggle} title="Change call language">
            🌐 {callLang === 'hinglish' ? 'Hinglish' : 'English'}
          </button>
        )}
        
        <div className="call-encryption-badge">
          <span>🔒 Encrypted</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="call-main-content">
        
        {/* Profile Avatar Section with Dynamic Visualizer Rings */}
        <div className="call-avatar-wrapper">
          <div className={`avatar-pulse-ring ring-1 ${callState} ${isMuted ? 'muted' : ''}`} />
          <div className={`avatar-pulse-ring ring-2 ${callState} ${isMuted ? 'muted' : ''}`} />
          <div className="call-profile-avatar">
            <img src="/images/companion-4.jpg" alt={settings.aiName} />
          </div>
        </div>

        {/* Companion and Timer Info */}
        <div className="call-info-section">
          <h2 className="call-companion-name">{settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}</h2>
          
          <div className="call-duration-tag">
            {callState === 'calling' ? (
              <span className="status-blinking">Calling...</span>
            ) : callState === 'ended' ? (
              <span style={{ color: 'var(--error)' }}>Call Ended</span>
            ) : (
              <span>{formatTime(duration)}</span>
            )}
          </div>

          {/* Status Badge */}
          <div className="call-status-badge">
            {callState === 'calling' && <span className="badge-item calling">🔔 Connecting</span>}
            {callState === 'connected' && <span className="badge-item connected">✔️ Ready</span>}
            {callState === 'thinking' && <span className="badge-item thinking">⚡ Companion Thinking</span>}
            {callState === 'speaking' && (
              <span className="badge-item speaking animate-glow">
                📢 {settings.aiName || 'Companion'} Speaking
                <div className="status-voice-waves">
                  <span /> <span /> <span />
                </div>
              </span>
            )}
            {callState === 'listening' && (
              <span className="badge-item listening">
                🎙️ {isMuted ? 'Muted' : 'Listening... Speak now'}
                {!isMuted && (
                  <div className="status-listening-pulse">
                    <span />
                  </div>
                )}
              </span>
            )}
          </div>
        </div>

      </main>

      {/* Live Subtitle Transcript — positioned above controls */}
      <AnimatePresence>
        {showTranscripts && transcripts.length > 0 && callState !== 'calling' && callState !== 'ended' && (
          <motion.div 
            className="call-subtitles-container glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="subtitles-scroll-box">
              {transcripts.map((t, i) => (
                <div key={i} className={`subtitle-line ${t.role}`}>
                  <span className="subtitle-speaker">
                    {t.role === 'user' ? 'You' : (settings.aiName || 'Companion')}:
                  </span>
                  <span className="subtitle-text">{t.text}</span>
                </div>
              ))}
              <div ref={subtitlesEndRef} style={{ height: 1, flexShrink: 0 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Controls Bar */}
      <footer className="call-controls-bar glass-card">
        
        {/* Mute Mic Button */}
        <button 
          className={`control-btn ${isMuted ? 'active-mute' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? '🔇' : '🎙️'}
          <span className="control-label">Mic</span>
        </button>

        {/* Live Transcripts Toggle Button */}
        <button 
          className={`control-btn ${showTranscripts ? 'active-blue' : ''}`}
          onClick={() => setShowTranscripts(!showTranscripts)}
          title="Toggle Subtitles Transcript"
        >
          📄
          <span className="control-label">Subtitles</span>
        </button>

        {/* Speaker Mute Button */}
        <button 
          className={`control-btn ${isSpeakerMuted ? 'active-mute' : ''}`}
          onClick={toggleSpeaker}
          title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
        >
          {isSpeakerMuted ? '🔈' : '🔊'}
          <span className="control-label">Speaker</span>
        </button>

        {/* End Call Button */}
        <button 
          className="control-btn end-call"
          onClick={handleEndCall}
          title="End Call"
        >
          📞
          <span className="control-label">End</span>
        </button>

      </footer>
    </div>
  );
}
