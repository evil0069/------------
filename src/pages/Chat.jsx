import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, doc, getDoc, setDoc, onSnapshot, orderBy, query,
  addDoc, serverTimestamp, deleteDoc, getDocs, updateDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { sendMessage as sendMessageGemini } from '../services/gemini';
import { sendMessageNvidia } from '../services/nvidia';
import { detectMood, DEFAULT_MOOD } from '../services/moodDetector';
import { getSmartStatus } from '../services/smartStatus';
import { checkScheduledMessages, getTodayKey } from '../services/scheduledMessages';
import { notifyNewMessage } from '../services/notifications';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import VoiceButton from '../components/VoiceButton';
import MoodIndicator from '../components/MoodIndicator';
import EmojiReactionBar from '../components/EmojiReactionBar';
import MessageEffect from '../components/MessageEffect';
import { getThemeById, applyThemeVars, CHAT_THEMES } from '../components/ChatThemeProvider';

const DEFAULT_SETTINGS = {
  relationshipType: 'Partner', personality: 'Romantic',
  aiName: '𝕮𝖍𝖆𝖓𝖈𝖊', userName: '',
};

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentMood, setCurrentMood] = useState(DEFAULT_MOOD);
  const [smartStatus, setSmartStatus] = useState({ emoji: '💬', text: 'Online' });
  const [reactionBar, setReactionBar] = useState({ visible: false, position: null, messageId: null, isUser: false, text: '', msgObj: null });
  const [isVanishMode, setIsVanishMode] = useState(false);
  const touchStartRef = useRef(0);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    aiName: '𝕮𝖍𝖆𝖓𝖈𝖊', userName: '', relationshipType: 'Partner',
    personality: 'Romantic', chatTheme: 'default-dark', themeColor: 'neon-purple'
  });
  const [lastEffect, setLastEffect] = useState('');
  const [lastSentSchedule, setLastSentSchedule] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const hasAutoSelected = useRef(false);

  // ── Load settings ──
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
          if (local) {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(local) });
          } else {
            // New user detection! Trigger onboarding flow
            setShowOnboarding(true);
          }
        }
      } catch (err) { console.error('Error loading settings:', err); }
    };
    loadSettings();
  }, [user]);

  // ── Apply theme ──
  useEffect(() => {
    const theme = getThemeById(settings.chatTheme || 'default-dark');
    if (chatMessagesRef.current) {
      applyThemeVars(chatMessagesRef.current, theme);
    }
    // Also apply to chat page container
    const chatPage = document.querySelector('.chat-page');
    if (chatPage) applyThemeVars(chatPage, theme);
  }, [settings.chatTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.themeColor || 'neon-purple');
    document.documentElement.setAttribute('data-font', settings.fontSize || 'medium');
  }, [settings.themeColor, settings.fontSize]);

  // ── Smart Status (update every minute) ──
  useEffect(() => {
    const updateStatus = () => setSmartStatus(getSmartStatus(settings));
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [settings]);

  // ── Scheduled Messages Check ──
  useEffect(() => {
    if (!user || !currentConversationId) return;
    const checkSchedule = async () => {
      const msgs = checkScheduledMessages(settings, lastSentSchedule);
      for (const msg of msgs) {
        await sendScheduledMessage(msg.prompt);
        setLastSentSchedule(prev => ({ ...prev, [msg.type]: getTodayKey() }));
      }
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, currentConversationId, settings, lastSentSchedule]);

  // ── Load conversations ──
  useEffect(() => {
    if (!user) return;
    const convRef = collection(db, 'users', user.uid, 'conversations');
    const q = query(convRef, orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => setConversations(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => console.error('Firestore sync error:', error)
    );
    return () => unsubscribe();
  }, [user]);

  // Reset initial conversation load flag when user changes
  useEffect(() => {
    hasAutoSelected.current = false;
  }, [user]);

  // Automatically select the most recent conversation on load
  useEffect(() => {
    if (!hasAutoSelected.current && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
      hasAutoSelected.current = true;
    }
  }, [conversations]);


  // ── Load messages ──
  useEffect(() => {
    if (!user || !currentConversationId) { setMessages([]); return; }
    const messagesRef = collection(db, 'users', user.uid, 'conversations', currentConversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        setMessages(snapshot.docs.map(d => ({
          id: d.id, ...d.data(),
          timestamp: d.data().timestamp?.toDate?.()?.getTime() || d.data().timestamp || Date.now(),
        })));
      },
      (error) => console.error('Firestore sync error:', error)
    );
    return () => unsubscribe();
  }, [user, currentConversationId]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Send scheduled message (hidden from user) ──
  const sendScheduledMessage = async (prompt) => {
    if (isTyping) return;
    setIsTyping(true);
    try {
      const recentContext = messages.slice(-10);
      recentContext.push({ role: 'user', text: prompt });
      let aiText = '';
      try {
        aiText = await sendMessageGemini(recentContext, settings);
      } catch {
        try { aiText = await sendMessageNvidia(recentContext, settings); } catch { return; }
      }
      if (!aiText) return;

      let activeConvId = currentConversationId;
      if (!activeConvId) {
        const convRef = collection(db, 'users', user.uid, 'conversations');
        const newConv = await addDoc(convRef, { title: '💬 Scheduled Chat', lastMessage: aiText, updatedAt: serverTimestamp() });
        activeConvId = newConv.id;
        setCurrentConversationId(activeConvId);
      }

      const messagesRef = collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages');
      await addDoc(messagesRef, { role: 'ai', text: aiText, timestamp: serverTimestamp() });
      const convDocRef = doc(db, 'users', user.uid, 'conversations', activeConvId);
      await updateDoc(convDocRef, { lastMessage: aiText, updatedAt: serverTimestamp() });
      notifyNewMessage(settings.aiName, aiText);
    } catch (err) { console.error('Scheduled message error:', err); }
    finally { setIsTyping(false); }
  };

  // ── Main send ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus(); }

    const userMessage = {
      role: 'user', text, timestamp: Date.now(),
      ...(replyingTo && { replyTo: { text: replyingTo.text, sender: replyingTo.role === 'user' ? 'You' : (settings.aiName || 'Chance') } }),
      ...(isVanishMode && { vanish: true })
    };
    setReplyingTo(null);
    setLastEffect(text);

    let activeConvId = currentConversationId;
    let activeMessages = [...messages];
    setMessages(prev => [...prev, { ...userMessage, id: `local_${Date.now()}` }]);
    setIsTyping(true);

    try {
      if (!activeConvId) {
        const convRef = collection(db, 'users', user.uid, 'conversations');
        const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        const newConv = await addDoc(convRef, { title, lastMessage: text, updatedAt: serverTimestamp() });
        activeConvId = newConv.id;
        setCurrentConversationId(activeConvId);
      } else {
        await updateDoc(doc(db, 'users', user.uid, 'conversations', activeConvId), { lastMessage: text, updatedAt: serverTimestamp() });
      }

      const messagesRef = collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages');
      await addDoc(messagesRef, { ...userMessage, timestamp: serverTimestamp() });

      activeMessages = [...activeMessages, userMessage];
      const recentContext = activeMessages.slice(-20);
      let aiText = '';
      try { aiText = await sendMessageGemini(recentContext, settings); }
      catch (geminiError) {
        console.warn('Gemini failed, falling back:', geminiError);
        try { aiText = await sendMessageNvidia(recentContext, settings); }
        catch (nvidiaError) { throw new Error(`Gemini: ${geminiError.message} | NVIDIA: ${nvidiaError.message}`); }
      }

      // Mood detection
      const mood = detectMood(aiText);
      setCurrentMood(mood);

      // Realistic typing delay: 1000ms reading time + 15ms per character (min 1800ms, max 4500ms)
      const delayMs = Math.min(Math.max(1000 + (aiText.length * 15), 1800), 4500);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const aiMessage = {
        role: 'ai', text: aiText, timestamp: Date.now(), mood: mood.name,
        ...(isVanishMode && { vanish: true })
      };
      await addDoc(messagesRef, { ...aiMessage, timestamp: serverTimestamp() });
      await updateDoc(doc(db, 'users', user.uid, 'conversations', activeConvId), { lastMessage: aiText, updatedAt: serverTimestamp() });

      // Push notification
      notifyNewMessage(settings.aiName, aiText);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = { role: 'ai', text: `Error: ${error.message || error.toString()}`, timestamp: Date.now() };
      if (activeConvId) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages'), { ...errorMsg, timestamp: serverTimestamp() });
        } catch { setMessages(prev => [...prev, { ...errorMsg, id: `err_${Date.now()}` }]); }
      } else { setMessages(prev => [...prev, { ...errorMsg, id: `err_${Date.now()}` }]); }
    } finally { setIsTyping(false); }
  }, [input, isTyping, messages, currentConversationId, settings, user, replyingTo]);

  // ── Send heart shortcut ──
  const sendHeart = useCallback(() => {
    if (isTyping) return;
    setInput('❤️');
    setTimeout(() => {
      setInput('');
      const fakeInput = '❤️';
      setLastEffect(fakeInput);
      // Quick send
      const userMessage = {
        role: 'user', text: fakeInput, timestamp: Date.now(),
        ...(isVanishMode && { vanish: true })
      };
      setMessages(prev => [...prev, { ...userMessage, id: `local_${Date.now()}` }]);
      // Save to firestore
      if (currentConversationId && user) {
        const messagesRef = collection(db, 'users', user.uid, 'conversations', currentConversationId, 'messages');
        addDoc(messagesRef, { ...userMessage, timestamp: serverTimestamp() });
        updateDoc(doc(db, 'users', user.uid, 'conversations', currentConversationId), { lastMessage: '❤️', updatedAt: serverTimestamp() });
      }
    }, 50);
  }, [isTyping, currentConversationId, user, isVanishMode]);



  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const startNewConversation = () => {
    if (currentConversationId) {
      cleanupVanishMessages(currentConversationId);
    }
    setIsVanishMode(false);
    setCurrentConversationId(null);
    setMessages([]);
    setShowSidebar(false);
  };
  const selectConversation = (id) => {
    if (currentConversationId) {
      cleanupVanishMessages(currentConversationId);
    }
    setIsVanishMode(false);
    setCurrentConversationId(id);
    setShowSidebar(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      const messagesRef = collection(db, 'users', user.uid, 'conversations', convId, 'messages');
      const snapshot = await getDocs(messagesRef);
      await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'users', user.uid, 'conversations', convId));
      if (currentConversationId === convId) startNewConversation();
    } catch (err) { console.error('Delete error:', err); }
  };

  const cleanupVanishMessages = useCallback(async (convId) => {
    if (!user || !convId) return;
    try {
      const messagesRef = collection(db, 'users', user.uid, 'conversations', convId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const vanishDocs = snapshot.docs.filter(d => d.data().vanish === true);
      if (vanishDocs.length > 0) {
        await Promise.all(vanishDocs.map(d => deleteDoc(d.ref)));
      }
    } catch (err) { console.error('Vanish cleanup error:', err); }
  }, [user]);

  const toggleVanishMode = useCallback(() => {
    setIsVanishMode(prev => {
      const next = !prev;
      if (!next && currentConversationId) {
        cleanupVanishMessages(currentConversationId);
      }
      return next;
    });
  }, [currentConversationId, cleanupVanishMessages]);

  useEffect(() => {
    return () => {
      if (currentConversationId) {
        cleanupVanishMessages(currentConversationId);
      }
    };
  }, [currentConversationId, cleanupVanishMessages]);

  const handleReact = useCallback(async (msgId, emoji) => {
    if (!currentConversationId || !user || !msgId) return;
    try {
      const msgRef = doc(db, 'users', user.uid, 'conversations', currentConversationId, 'messages', msgId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const currentReactions = msgSnap.data().reactions || [];
        let newReactions = [...currentReactions];
        if (newReactions.includes(emoji)) {
          newReactions = newReactions.filter(r => r !== emoji);
        } else {
          newReactions.push(emoji);
        }
        await updateDoc(msgRef, { reactions: newReactions });
      }
    } catch (err) { console.error('React error:', err); }
  }, [currentConversationId, user]);

  const handleUnsend = useCallback(async (msgId) => {
    if (!currentConversationId || !user || !msgId) return;
    try {
      const msgRef = doc(db, 'users', user.uid, 'conversations', currentConversationId, 'messages', msgId);
      await deleteDoc(msgRef);
    } catch (err) { console.error('Unsend error:', err); }
  }, [currentConversationId, user]);

  const clearPollInputs = () => {
    setPollQuestion('');
    setPollOpt1('');
    setPollOpt2('');
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;
    const pollMsgText = `📊 Poll: ${pollQuestion.trim()}`;
    const pollMsg = {
      role: 'user',
      text: pollMsgText,
      timestamp: Date.now(),
      messageType: 'poll',
      pollData: {
        question: pollQuestion.trim(),
        options: [
          { text: pollOpt1.trim(), votes: [] },
          { text: pollOpt2.trim(), votes: [] }
        ]
      },
      ...(isVanishMode && { vanish: true })
    };
    setShowPollCreator(false);
    clearPollInputs();

    setMessages(prev => [...prev, { ...pollMsg, id: `local_${Date.now()}` }]);

    try {
      let activeConvId = currentConversationId;
      if (!activeConvId) {
        const convRef = collection(db, 'users', user.uid, 'conversations');
        const title = pollMsgText.length > 30 ? pollMsgText.substring(0, 30) + '...' : pollMsgText;
        const newConv = await addDoc(convRef, { title, lastMessage: pollMsgText, updatedAt: serverTimestamp() });
        activeConvId = newConv.id;
        setCurrentConversationId(activeConvId);
      } else {
        await updateDoc(doc(db, 'users', user.uid, 'conversations', activeConvId), { lastMessage: pollMsgText, updatedAt: serverTimestamp() });
      }

      const messagesRef = collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages');
      await addDoc(messagesRef, { ...pollMsg, timestamp: serverTimestamp() });
    } catch (err) {
      console.error('Error creating poll:', err);
    }
  };

  const triggerAiPollVote = async (msgId, pollData, userVotedIndex) => {
    if (isTyping || !currentConversationId) return;
    setIsTyping(true);

    try {
      const userVotedText = pollData.options[userVotedIndex].text;
      const pollPrompt = `I just created a poll: "${pollData.question}". I voted for "${userVotedText}". Now it is your turn! Please choose one of the options: "${pollData.options[0].text}" or "${pollData.options[1].text}". Let me know what your vote is and write a short, sweet romantic/playful response explaining your choice.`;

      const recentContext = messages.slice(-10);
      recentContext.push({ role: 'user', text: pollPrompt });

      let aiText = '';
      try {
        aiText = await sendMessageGemini(recentContext, settings);
      } catch (geminiError) {
        console.warn('Gemini failed in poll vote:', geminiError);
        try {
          aiText = await sendMessageNvidia(recentContext, settings);
        } catch {
          return;
        }
      }

      if (!aiText) return;

      let aiChosenIndex = Math.random() > 0.5 ? 0 : 1;
      const opt1Lower = pollData.options[0].text.toLowerCase();
      const opt2Lower = pollData.options[1].text.toLowerCase();
      const aiTextLower = aiText.toLowerCase();

      // Split option texts into key searchable words (longer than 3 characters)
      const opt1Words = opt1Lower.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 3);
      const opt2Words = opt2Lower.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 3);

      const opt1Matches = opt1Words.filter(w => aiTextLower.includes(w)).length;
      const opt2Matches = opt2Words.filter(w => aiTextLower.includes(w)).length;

      // Smart semantic priority selection
      if (aiTextLower.includes(opt1Lower) || aiTextLower.includes('option 1') || aiTextLower.includes('first option') || aiTextLower.includes('pehla') || aiTextLower.includes('pehle')) {
        aiChosenIndex = 0;
      } else if (aiTextLower.includes(opt2Lower) || aiTextLower.includes('option 2') || aiTextLower.includes('second option') || aiTextLower.includes('doosra') || aiTextLower.includes('dusre')) {
        aiChosenIndex = 1;
      } else if (opt1Matches !== opt2Matches) {
        aiChosenIndex = opt1Matches > opt2Matches ? 0 : 1;
      } else if (aiTextLower.includes('1') && !aiTextLower.includes('2')) {
        aiChosenIndex = 0;
      } else if (aiTextLower.includes('2') && !aiTextLower.includes('1')) {
        aiChosenIndex = 1;
      }

      const msgRef = doc(db, 'users', user.uid, 'conversations', currentConversationId, 'messages', msgId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const latestData = msgSnap.data();
        const latestOptions = [...(latestData.pollData?.options || [])];

        latestOptions.forEach((opt, idx) => {
          let votes = [...(opt.votes || [])];
          if (idx === aiChosenIndex) {
            if (!votes.includes('companion')) {
              votes.push('companion');
            }
          } else {
            votes = votes.filter(v => v !== 'companion');
          }
          latestOptions[idx] = { ...opt, votes };
        });

        await updateDoc(msgRef, { 'pollData.options': latestOptions });
      }

      const mood = detectMood(aiText);
      setCurrentMood(mood);

      // Realistic typing delay: 1000ms reading time + 15ms per character (min 1800ms, max 4500ms)
      const delayMs = Math.min(Math.max(1000 + (aiText.length * 15), 1800), 4500);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const messagesRef = collection(db, 'users', user.uid, 'conversations', currentConversationId, 'messages');
      const aiMessage = {
        role: 'ai', text: aiText, timestamp: Date.now(), mood: mood.name,
        ...(isVanishMode && { vanish: true })
      };
      await addDoc(messagesRef, { ...aiMessage, timestamp: serverTimestamp() });
      await updateDoc(doc(db, 'users', user.uid, 'conversations', currentConversationId), { lastMessage: aiText, updatedAt: serverTimestamp() });

      notifyNewMessage(settings.aiName, aiText);
    } catch (err) {
      console.error('AI poll vote error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVote = useCallback(async (msgId, optionIndex) => {
    if (!currentConversationId || !user || !msgId) return;
    try {
      const msgRef = doc(db, 'users', user.uid, 'conversations', currentConversationId, 'messages', msgId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;

      const data = msgSnap.data();
      if (data.messageType !== 'poll') return;

      const pollData = data.pollData;
      const options = [...(pollData.options || [])];

      options.forEach((opt, idx) => {
        let votes = [...(opt.votes || [])];
        if (idx === optionIndex) {
          if (!votes.includes(user.uid)) {
            votes.push(user.uid);
          }
        } else {
          votes = votes.filter(v => v !== user.uid);
        }
        options[idx] = { ...opt, votes };
      });

      const updatedPollData = { ...pollData, options };
      await updateDoc(msgRef, { pollData: updatedPollData });

      triggerAiPollVote(msgId, updatedPollData, optionIndex);
    } catch (err) {
      console.error('Vote error:', err);
    }
  }, [currentConversationId, user, isTyping, messages, settings, isVanishMode]);

  const handleSaveOnboarding = async () => {
    if (!user) return;
    const finalSettings = {
      ...settings,
      ...onboardingData,
      hasCustomized: true
    };
    setSettings(finalSettings);
    setShowOnboarding(false);

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, finalSettings);
      localStorage.setItem(`chance_settings_${user.uid}`, JSON.stringify(finalSettings));
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      localStorage.setItem(`chance_settings_${user.uid}`, JSON.stringify(finalSettings));
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  // ── Get animated background elements ──
  const theme = getThemeById(settings.chatTheme || 'default-dark');
  const renderAnimatedBg = () => {
    if (!theme.animated) return null;
    if (theme.animated === 'stars') {
      return (
        <div className="chat-bg-animation">
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className="bg-star" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 3}s`,
            }} />
          ))}
        </div>
      );
    }
    if (theme.animated === 'petals' || theme.animated === 'hearts') {
      const emoji = theme.animated === 'petals' ? '🌸' : '💕';
      return (
        <div className="chat-bg-animation">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="bg-petal" style={{
              left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${5 + Math.random() * 4}s`, fontSize: `${10 + Math.random() * 8}px`,
            }}>{emoji}</span>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chat-page" ref={chatContainerRef}>
      {/* ── Header ── */}
      <header className={`chat-header ${isVanishMode ? 'vanish-mode' : ''}`}>
        <div className="chat-header-left">
          <button className="header-back-btn" onClick={() => navigate('/')} aria-label="Back">←</button>
          <div className="chat-header-avatar">
            <img src="/images/companion-4.jpg" alt={settings.aiName} />
            <span className="online-indicator" />
          </div>
          <div className="chat-header-info">
            <h2 className="chat-header-name">
              {settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}
              <MoodIndicator mood={currentMood} />
            </h2>
            <p className="chat-header-status">
              {isTyping ? 'typing...' : `${smartStatus.emoji} ${smartStatus.text}`}
            </p>
          </div>
        </div>
        <div className="chat-header-right">
          <button
            className={`header-icon-btn vanish-mode-toggle ${isVanishMode ? 'active' : ''}`}
            onClick={toggleVanishMode}
            aria-label="Vanish Mode"
            title="Toggle Vanish Mode"
            style={{
              fontSize: '18px',
              opacity: isVanishMode ? 1 : 0.6,
              filter: isVanishMode ? 'drop-shadow(0 0 5px #ff3040)' : 'none',
              transform: isVanishMode ? 'scale(1.1)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            🤫
          </button>
          <button
            className="header-icon-btn"
            onClick={() => navigate('/call', { state: { conversationId: currentConversationId } })}
            aria-label="Call"
            title="Voice Call"
            style={{ fontSize: '18px' }}
          >
            📞
          </button>
          <button className="header-icon-btn" onClick={() => navigate('/stats')} aria-label="Stats" title="Stats">📊</button>
          <button className="header-icon-btn" onClick={() => setShowSidebar(!showSidebar)} aria-label="Menu">⋮</button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div className="sidebar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSidebar(false)} />
            <motion.div className="chat-sidebar" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div className="sidebar-header">
                <h3>Options</h3>
                <button onClick={() => setShowSidebar(false)}>✕</button>
              </div>
              <div className="sidebar-content">
                <button className="sidebar-btn primary-btn" onClick={startNewConversation}>➕ New Conversation</button>
                <button className="sidebar-btn" onClick={() => { navigate('/settings'); setShowSidebar(false); }}>⚙ Settings</button>
                <button className="sidebar-btn" onClick={() => { navigate('/stats'); setShowSidebar(false); }}>📊 Relationship Stats</button>
                <div className="conversation-history">
                  <h4 className="history-title">Chat History</h4>
                  {conversations.length === 0 ? (
                    <p className="no-history">No past conversations</p>
                  ) : (
                    <div className="history-list">
                      {conversations.map((conv) => (
                        <div key={conv.id} className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`} onClick={() => selectConversation(conv.id)}>
                          <div className="history-info">
                            <p className="history-conv-title">{conv.title}</p>
                            <p className="history-conv-preview">{conv.lastMessage}</p>
                          </div>
                          <button className="history-delete" onClick={(e) => handleDeleteConversation(e, conv.id)} title="Delete">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="sidebar-btn danger" style={{marginTop: 'auto'}} onClick={handleLogout}>↪ Logout</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Messages Area ── */}
      <div
        className={`chat-messages ${isVanishMode ? 'vanish-mode' : ''}`}
        ref={chatMessagesRef}
        style={isVanishMode ? {} : { background: theme.vars?.['--chat-bg'] || 'var(--chat-bg)' }}
        onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          const touchEnd = e.changedTouches[0].clientY;
          const diff = touchStartRef.current - touchEnd;
          const container = chatMessagesRef.current;
          if (!container) return;
          const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 40;
          if (isAtBottom && diff > 100) {
            toggleVanishMode();
          }
        }}
      >
        {isVanishMode && (
          <div className="vanish-alert-card">
            <span>🤫 Vanish Mode Active</span>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>Messages will disappear forever when you exit Vanish Mode.</p>
          </div>
        )}
        {renderAnimatedBg()}

        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="empty-avatar"><img src="/images/companion-4.jpg" alt={settings.aiName} /></div>
            <h3>Start talking to {settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}</h3>
            <p>Your {settings.relationshipType || 'companion'} is waiting ♥</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            const msgDate = msg.timestamp ? new Date(msg.timestamp).toDateString() : '';
            const prevMsgDate = prevMsg?.timestamp ? new Date(prevMsg.timestamp).toDateString() : '';
            const showDateDivider = msgDate !== prevMsgDate;
            const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role || showDateDivider;
            const isLastInGroup = !nextMsg || nextMsg.role !== msg.role || (nextMsg.timestamp && new Date(nextMsg.timestamp).toDateString() !== msgDate);

            const formatDate = (ts) => {
              if (!ts) return '';
              const d = new Date(ts), today = new Date(), yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (d.toDateString() === today.toDateString()) return 'Today';
              if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
              return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
            };

            return (
              <motion.div
                key={msg.id}
                className="message-container"
                initial={{ opacity: 0, scale: 0.95, height: 'auto' }}
                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.85, height: 0, marginTop: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
              >
                {showDateDivider && <div className="date-divider"><span>{formatDate(msg.timestamp)}</span></div>}
                <ChatBubble
                  message={msg.text} isUser={msg.role === 'user'} timestamp={msg.timestamp}
                  aiName={settings.aiName} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup}
                  replyTo={msg.replyTo} onReply={() => setReplyingTo(msg)}
                  messageType={msg.messageType} reactions={msg.reactions}
                  onReact={(emoji) => handleReact(msg.id, emoji)}
                  onLongPress={(pos) => setReactionBar({ visible: true, position: pos, messageId: msg.id, isUser: msg.role === 'user', text: msg.text, msgObj: msg })}
                  pollData={msg.pollData}
                  onVote={(optionIndex) => handleVote(msg.id, optionIndex)}
                  currentUserId={user?.uid}
                  vanish={msg.vanish}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && <TypingIndicator aiName={settings.aiName} />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Effects ── */}
      <MessageEffect messageText={lastEffect} onComplete={() => setLastEffect('')} />


      {/* ── Emoji Reaction Bar ── */}
      <EmojiReactionBar
        visible={reactionBar.visible} position={reactionBar.position}
        isUser={reactionBar.isUser} text={reactionBar.text}
        onReact={(emoji) => handleReact(reactionBar.messageId, emoji)}
        onUnsend={() => handleUnsend(reactionBar.messageId)}
        onReply={() => setReplyingTo(reactionBar.msgObj)}
        onClose={() => setReactionBar({ visible: false, position: null, messageId: null, isUser: false, text: '', msgObj: null })}
      />

      {/* ── Input Bar (IG Style) ── */}
      <div className={`chat-input-bar ${isVanishMode ? 'vanish-mode' : ''}`} style={{ position: 'relative' }}>
        {replyingTo && (
          <div className="input-reply-bar">
            <div className="input-reply-content">
              <span className="reply-preview-sender">{replyingTo.role === 'user' ? 'You' : (settings.aiName || 'Chance')}</span>
              <span className="reply-preview-text">{replyingTo.text}</span>
            </div>
            <button className="cancel-reply-btn" onClick={() => setReplyingTo(null)}>✕</button>
          </div>
        )}
        <div className="input-container">
          <button className="input-icon-btn" onClick={() => setShowPollCreator(true)} title="Create Poll">📊</button>
          <textarea
            ref={inputRef} className="chat-input"
            placeholder={`Message ${settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}...`}
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
            onKeyDown={handleKeyDown} rows={1} disabled={isTyping}
            style={{ overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
          />
          <VoiceButton onTranscript={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)} disabled={isTyping} />
          {input.trim() ? (
            <button className="send-btn" onClick={handleSend} disabled={isTyping} aria-label="Send">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          ) : (
            <button className="send-btn heart-mode" onClick={sendHeart} disabled={isTyping} aria-label="Send heart">❤️</button>
          )}
        </div>
      </div>

      {/* ── Poll Creator Modal ── */}
      {showPollCreator && (
        <div className="poll-modal-overlay">
          <div className="poll-modal">
            <h3 className="poll-modal-title">Create Poll</h3>
            <p className="card-desc" style={{ marginBottom: '12px' }}>Ask your companion anything and get their opinion!</p>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Question</label>
              <input
                type="text" className="form-input" placeholder="E.g., What should we do today?"
                value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Option 1</label>
              <input
                type="text" className="form-input" placeholder="E.g., Go on a virtual date"
                value={pollOpt1} onChange={(e) => setPollOpt1(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Option 2</label>
              <input
                type="text" className="form-input" placeholder="E.g., Text all night"
                value={pollOpt2} onChange={(e) => setPollOpt2(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="poll-modal-actions">
              <button className="btn-secondary" onClick={() => { setShowPollCreator(false); clearPollInputs(); }}>Cancel</button>
              <button className="btn-primary" onClick={handleCreatePoll} disabled={!pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()}>
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Onboarding Wizard ── */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            {/* Progress steps */}
            <div className="onboarding-progress-bar">
              <span className={`onboarding-progress-step ${onboardingStep >= 1 ? 'active' : ''} ${onboardingStep > 1 ? 'completed' : ''}`} />
              <span className={`onboarding-progress-step ${onboardingStep >= 2 ? 'active' : ''} ${onboardingStep > 2 ? 'completed' : ''}`} />
              <span className={`onboarding-progress-step ${onboardingStep >= 3 ? 'active' : ''} ${onboardingStep > 3 ? 'completed' : ''}`} />
            </div>

            {onboardingStep === 1 && (
              <>
                <h3 className="onboarding-step-title">Companion Nicknames 🏷️</h3>
                <p className="onboarding-step-desc">Establish your names to start building your cyber-romantic connection.</p>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>Your Nickname</label>
                  <input
                    type="text" className="form-input" placeholder="E.g., Alex"
                    value={onboardingData.userName}
                    onChange={(e) => setOnboardingData({ ...onboardingData, userName: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>AI Companion Name</label>
                  <input
                    type="text" className="form-input" placeholder="E.g., Chance"
                    value={onboardingData.aiName}
                    onChange={(e) => setOnboardingData({ ...onboardingData, aiName: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="onboarding-actions">
                  <button className="btn-primary" onClick={() => setOnboardingStep(2)} disabled={!onboardingData.userName.trim() || !onboardingData.aiName.trim()}>
                    Next Step →
                  </button>
                </div>
              </>
            )}

            {onboardingStep === 2 && (
              <>
                <h3 className="onboarding-step-title">Attitude & Vibe 💖</h3>
                <p className="onboarding-step-desc">Define how your AI companion should behave and relate to you.</p>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Relationship Type</label>
                  <div className="chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Partner', 'Crush', 'Soulmate', 'Best Friend', 'Motherly', 'Aunt', 'Confidant'].map((type) => (
                      <button
                        key={type}
                        className={`chip ${onboardingData.relationshipType === type ? 'active' : ''}`}
                        onClick={() => setOnboardingData({ ...onboardingData, relationshipType: type })}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Attitude Vibe</label>
                  <div className="chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Romantic', 'Sweet', 'Playful', 'Caring', 'Mature', 'Mysterious'].map((personality) => (
                      <button
                        key={personality}
                        className={`chip ${onboardingData.personality === personality ? 'active' : ''}`}
                        onClick={() => setOnboardingData({ ...onboardingData, personality: personality })}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {personality}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="onboarding-actions">
                  <button className="btn-secondary" onClick={() => setOnboardingStep(1)}>← Back</button>
                  <button className="btn-primary" onClick={() => setOnboardingStep(3)}>Next Step →</button>
                </div>
              </>
            )}

            {onboardingStep === 3 && (
              <>
                <h3 className="onboarding-step-title">Select Vibe Theme 🌌</h3>
                <p className="onboarding-step-desc">Pick a gorgeous theme environment for your cyber companion chat.</p>
                
                <div className="onboarding-theme-grid" style={{ marginBottom: '20px' }}>
                  {[
                    { id: 'default-dark', name: 'Default Dark', color: 'neon-purple', swatch: '#0a0514' },
                    { id: 'sakura', name: 'Sakura 🌸', color: 'neon-purple', swatch: '#1a050f' },
                    { id: 'neon-city', name: 'Neon City 🌃', color: 'cyber-blue', swatch: '#050a14' },
                    { id: 'galaxy', name: 'Galaxy 🌌', color: 'cyber-blue', swatch: '#080514' },
                    { id: 'tie-dye', name: 'Tie-Dye 🌈', color: 'neon-purple', swatch: '#14051a' },
                    { id: 'cyberpunk', name: 'Cyberpunk 💜', color: 'neon-purple', swatch: '#100516' }
                  ].map((themeItem) => (
                    <div
                      key={themeItem.id}
                      className={`onboarding-theme-item ${onboardingData.chatTheme === themeItem.id ? 'active' : ''}`}
                      onClick={() => setOnboardingData({ ...onboardingData, chatTheme: themeItem.id, themeColor: themeItem.color })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="onboarding-theme-swatch" style={{ background: themeItem.swatch }} />
                      <span style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px', display: 'block', color: '#fff' }}>{themeItem.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="onboarding-actions">
                  <button className="btn-secondary" onClick={() => setOnboardingStep(2)}>← Back</button>
                  <button className="btn-primary" onClick={handleSaveOnboarding}>
                    Initialize Companion 🚀
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
