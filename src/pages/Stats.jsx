import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { calculateAllStats } from '../services/statsService';
import { MOOD_KEYWORDS } from '../services/moodDetector';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

export default function Stats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        // Get all conversations
        const convRef = collection(db, 'users', user.uid, 'conversations');
        const convSnap = await getDocs(convRef);

        // Get all messages from all conversations
        const allMessages = [];
        for (const convDoc of convSnap.docs) {
          const messagesRef = collection(db, 'users', user.uid, 'conversations', convDoc.id, 'messages');
          const msgQ = query(messagesRef, orderBy('timestamp', 'asc'));
          const msgSnap = await getDocs(msgQ);
          msgSnap.docs.forEach(d => {
            const data = d.data();
            allMessages.push({
              ...data,
              timestamp: data.timestamp?.toDate?.()?.getTime() || data.timestamp || Date.now(),
            });
          });
        }

        const calculated = calculateAllStats(allMessages);
        setStats(calculated);
      } catch (err) {
        console.error('Error loading stats:', err);
        setStats(calculateAllStats([]));
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-orb" />
        <p className="loading-text">Loading stats...</p>
      </div>
    );
  }

  if (!stats) return null;

  const moodEntries = Object.entries(stats.moodDistribution || {});
  const maxMood = Math.max(...moodEntries.map(([, v]) => v), 1);

  return (
    <div className="stats-page">
      <div className="settings-bg-effects">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <motion.div className="stats-container" initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>

        <motion.div className="stats-header" variants={fadeUp}>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="stats-title">Relationship Stats</h1>
          <p className="stats-subtitle">Your journey with your AI companion</p>
          {stats.title && (
            <motion.div className="relationship-title-badge"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.5 }}>
              {stats.title}
            </motion.div>
          )}
        </motion.div>

        <div className="stats-grid">
          {/* Streak */}
          <motion.div className="stat-box" variants={fadeUp} custom={1}>
            <span className="stat-box-icon"><span className="streak-fire">🔥</span></span>
            <span className="stat-box-value">{stats.streak}</span>
            <span className="stat-box-label">Day Streak</span>
          </motion.div>

          {/* Level */}
          <motion.div className="stat-box" variants={fadeUp} custom={2}>
            <span className="stat-box-icon">⭐</span>
            <span className="stat-box-value">{stats.level}</span>
            <span className="stat-box-label">Level</span>
            <div className="xp-bar-container">
              <div className="xp-bar-bg">
                <div className="xp-bar-fill" style={{ width: `${stats.progress}%` }} />
              </div>
              <div className="xp-bar-text">
                <span>{stats.currentXP} XP</span>
                <span>{stats.nextLevelXP} XP</span>
              </div>
            </div>
          </motion.div>

          {/* Total Messages */}
          <motion.div className="stat-box" variants={fadeUp} custom={3}>
            <span className="stat-box-icon">💬</span>
            <span className="stat-box-value">{stats.totalMessages}</span>
            <span className="stat-box-label">Total Messages</span>
          </motion.div>

          {/* Time Together */}
          <motion.div className="stat-box" variants={fadeUp} custom={4}>
            <span className="stat-box-icon">⏱️</span>
            <span className="stat-box-value">{stats.timeTogether}</span>
            <span className="stat-box-label">Time Together</span>
          </motion.div>

          {/* XP */}
          <motion.div className="stat-box wide" variants={fadeUp} custom={5}>
            <span className="stat-box-icon">✨</span>
            <span className="stat-box-value">{stats.xp.toLocaleString()}</span>
            <span className="stat-box-label">Total XP</span>
          </motion.div>

          {/* Message Breakdown */}
          <motion.div className="stat-box" variants={fadeUp} custom={6}>
            <span className="stat-box-icon">📤</span>
            <span className="stat-box-value">{stats.userMessages}</span>
            <span className="stat-box-label">You Sent</span>
          </motion.div>

          <motion.div className="stat-box" variants={fadeUp} custom={7}>
            <span className="stat-box-icon">📥</span>
            <span className="stat-box-value">{stats.aiMessages}</span>
            <span className="stat-box-label">AI Sent</span>
          </motion.div>

          {/* Mood Trends */}
          {moodEntries.length > 0 && (
            <motion.div className="stat-box wide" variants={fadeUp} custom={8}>
              <span className="stat-box-icon">😍</span>
              <span className="stat-box-label">Mood Trends</span>
              <div className="mood-chart">
                {moodEntries.map(([mood, count]) => {
                  const moodConfig = MOOD_KEYWORDS[mood];
                  return (
                    <div key={mood} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="mood-chart-bar" style={{ height: `${(count / maxMood) * 100}%` }} />
                      <span className="mood-chart-label">{moodConfig?.emoji || '💬'}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
