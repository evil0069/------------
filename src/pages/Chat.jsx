import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { sendMessage as sendMessageGemini } from '../services/gemini';
import { sendMessageNvidia } from '../services/nvidia';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';

const DEFAULT_SETTINGS = {
  relationshipType: 'Partner',
  personality: 'Romantic',
  aiName: '𝕮𝖍𝖆𝖓𝖈𝖊',
  userName: '',
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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load settings from Firestore / localStorage
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
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.themeColor || 'neon-purple');
    document.documentElement.setAttribute('data-bg', settings.chatBackground || 'dotted');
    document.documentElement.setAttribute('data-font', settings.fontSize || 'medium');
  }, [settings.themeColor, settings.chatBackground, settings.fontSize]);

  // Load list of conversations
  useEffect(() => {
    if (!user) return;

    const convRef = collection(db, 'users', user.uid, 'conversations');
    const q = query(convRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setConversations(convs);
      },
      (error) => {
        console.error('Firestore sync error (conversations):', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load messages for the current conversation
  useEffect(() => {
    if (!user) return;
    
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'users', user.uid, 'conversations', currentConversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.getTime() || doc.data().timestamp || Date.now(),
        }));
        setMessages(msgs);
      },
      (error) => {
        console.error('Firestore sync error (messages):', error);
      }
    );

    return () => unsubscribe();
  }, [user, currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }

    const userMessage = {
      role: 'user',
      text,
      timestamp: Date.now(),
      ...(replyingTo && { 
        replyTo: {
          text: replyingTo.text,
          sender: replyingTo.role === 'user' ? 'You' : (settings.aiName || 'Chance')
        }
      })
    };
    
    setReplyingTo(null);

    let activeConvId = currentConversationId;
    let activeMessages = [...messages];

    // Optimistically update UI
    setMessages((prev) => [...prev, { ...userMessage, id: `local_${Date.now()}` }]);
    setIsTyping(true);

    try {
      // If no active conversation, create one
      if (!activeConvId) {
        const convRef = collection(db, 'users', user.uid, 'conversations');
        // Generate title from first message
        const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        const newConv = await addDoc(convRef, {
          title,
          lastMessage: text,
          updatedAt: serverTimestamp()
        });
        activeConvId = newConv.id;
        setCurrentConversationId(activeConvId);
      } else {
        // Update existing conversation metadata
        const convDocRef = doc(db, 'users', user.uid, 'conversations', activeConvId);
        await updateDoc(convDocRef, {
          lastMessage: text,
          updatedAt: serverTimestamp()
        });
      }

      // Save user message to subcollection
      const messagesRef = collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages');
      await addDoc(messagesRef, {
        ...userMessage,
        timestamp: serverTimestamp(),
      });

      // Send to AI (Gemini first, fallback to NVIDIA)
      activeMessages = [...activeMessages, userMessage];
      const recentContext = activeMessages.slice(-20);
      let aiText = '';
      
      try {
        aiText = await sendMessageGemini(recentContext, settings);
      } catch (geminiError) {
        console.warn('Gemini failed, falling back to NVIDIA:', geminiError);
        try {
          aiText = await sendMessageNvidia(recentContext, settings);
        } catch (nvidiaError) {
          throw new Error(`Gemini Error: ${geminiError.message} | NVIDIA Error: ${nvidiaError.message}`);
        }
      }

      const aiMessage = {
        role: 'ai',
        text: aiText,
        timestamp: Date.now(),
      };

      // Save AI response
      await addDoc(messagesRef, {
        ...aiMessage,
        timestamp: serverTimestamp(),
      });

      // Update conversation metadata with AI response
      const convDocRef = doc(db, 'users', user.uid, 'conversations', activeConvId);
      await updateDoc(convDocRef, {
        lastMessage: aiText,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error during message flow:', error);
      // Show error as AI message
      const errorMessage = {
        role: 'ai',
        text: `Error connecting: ${error.message || error.toString()}`,
        timestamp: Date.now(),
      };
      
      if (activeConvId) {
        try {
          const messagesRef = collection(db, 'users', user.uid, 'conversations', activeConvId, 'messages');
          await addDoc(messagesRef, {
            ...errorMessage,
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          setMessages((prev) => [...prev, { ...errorMessage, id: `local_err_${Date.now()}` }]);
        }
      } else {
         setMessages((prev) => [...prev, { ...errorMessage, id: `local_err_${Date.now()}` }]);
      }
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, currentConversationId, settings, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  const selectConversation = (id) => {
    setCurrentConversationId(id);
    setShowSidebar(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;

    try {
      // Delete all messages in the subcollection first
      const messagesRef = collection(db, 'users', user.uid, 'conversations', convId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      // Then delete the conversation document
      const convDocRef = doc(db, 'users', user.uid, 'conversations', convId);
      await deleteDoc(convDocRef);

      if (currentConversationId === convId) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="chat-page">
      {/* ─── Chat Header ─── */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            className="header-back-btn"
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            ←
          </button>
          <div className="chat-header-avatar">
            <img src="./images/companion-4.jpg" alt={settings.aiName} />
            <span className="online-indicator" />
          </div>
          <div className="chat-header-info">
            <h2 className="chat-header-name">{settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}</h2>
            <p className="chat-header-status">
              {isTyping ? 'typing...' : 'online'}
            </p>
          </div>
        </div>
        <div className="chat-header-right">
          <button
            className="header-icon-btn"
            onClick={() => setShowSidebar(!showSidebar)}
            aria-label="Toggle menu"
          >
            ⋮
          </button>
        </div>
      </header>

      {/* ─── Sidebar Menu ─── */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              className="chat-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="sidebar-header">
                <h3>Options</h3>
                <button onClick={() => setShowSidebar(false)}>✕</button>
              </div>
              <div className="sidebar-content">
                <button
                  className="sidebar-btn primary-btn"
                  onClick={startNewConversation}
                >
                  ➕ New Conversation
                </button>
                <button
                  className="sidebar-btn"
                  onClick={() => { navigate('/settings'); setShowSidebar(false); }}
                >
                  ⚙ Settings
                </button>

                <div className="conversation-history">
                  <h4 className="history-title">Chat History</h4>
                  {conversations.length === 0 ? (
                    <p className="no-history">No past conversations</p>
                  ) : (
                    <div className="history-list">
                      {conversations.map((conv) => (
                        <div 
                          key={conv.id} 
                          className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                          onClick={() => selectConversation(conv.id)}
                        >
                          <div className="history-info">
                            <p className="history-conv-title">{conv.title}</p>
                            <p className="history-conv-preview">{conv.lastMessage}</p>
                          </div>
                          <button 
                            className="history-delete" 
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="sidebar-btn danger" style={{marginTop: 'auto'}} onClick={handleLogout}>
                  ↪ Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Messages Area ─── */}
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="empty-avatar">
              <img src="./images/companion-4.jpg" alt={settings.aiName} />
            </div>
            <h3>Start talking to {settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}</h3>
            <p>Your {settings.relationshipType || 'companion'} is waiting to hear from you ♥</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];
          
          const msgDate = msg.timestamp ? new Date(msg.timestamp).toDateString() : '';
          const prevMsgDate = prevMsg && prevMsg.timestamp ? new Date(prevMsg.timestamp).toDateString() : '';
          const showDateDivider = msgDate !== prevMsgDate;

          const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role || showDateDivider;
          const isLastInGroup = !nextMsg || nextMsg.role !== msg.role || (nextMsg.timestamp && new Date(nextMsg.timestamp).toDateString() !== msgDate);

          const formatDateDivider = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) return 'Today';
            if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
          };

          return (
            <div key={msg.id} className="message-container">
              {showDateDivider && (
                <div className="date-divider">
                  <span>{formatDateDivider(msg.timestamp)}</span>
                </div>
              )}
              <ChatBubble
                message={msg.text}
                isUser={msg.role === 'user'}
                timestamp={msg.timestamp}
                aiName={settings.aiName}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                replyTo={msg.replyTo}
                onReply={() => setReplyingTo(msg)}
              />
            </div>
          );
        })}

        <AnimatePresence>
          {isTyping && <TypingIndicator aiName={settings.aiName} />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input Bar ─── */}
      <div className="chat-input-bar">
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
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={`Message ${settings.aiName || '𝕮𝖍𝖆𝖓𝖈𝖊'}...`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isTyping}
            style={{ overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
