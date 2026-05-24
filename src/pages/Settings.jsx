import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';

const RELATIONSHIP_TYPES = [
  'Partner',
  'Best Friend',
  'Crush',
  'Soulmate',
  'Boyfriend',
  'Girlfriend',
  'Companion',
  'Confidant',
];

const PERSONALITIES = [
  'Romantic',
  'Playful',
  'Caring',
  'Flirty',
  'Mysterious',
  'Poetic',
  'Protective',
  'Sweet',
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    relationshipType: 'Partner',
    personality: 'Romantic',
    aiName: '𝕮𝖍𝖆𝖓𝖈𝖊',
    userName: '',
    memory: '',
    themeColor: 'neon-purple',
    chatBackground: 'dotted',
    fontSize: 'medium',
    galleryUrls: [],
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `users/${user.uid}/gallery/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        alert('Failed to upload image. Ensure your Firebase Storage rules allow uploads.');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setSettings(prev => ({
          ...prev,
          galleryUrls: [...(prev.galleryUrls || []), downloadURL]
        }));
        setUploading(false);
        setUploadProgress(0);
      }
    );
  };

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.data() }));
        } else {
          const local = localStorage.getItem(`chance_settings_${user.uid}`);
          if (local) {
            setSettings((prev) => ({ ...prev, ...JSON.parse(local) }));
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        const local = localStorage.getItem(`chance_settings_${user.uid}`);
        if (local) {
          setSettings((prev) => ({ ...prev, ...JSON.parse(local) }));
        }
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.themeColor || 'neon-purple');
    document.documentElement.setAttribute('data-bg', settings.chatBackground || 'dotted');
    document.documentElement.setAttribute('data-font', settings.fontSize || 'medium');
  }, [settings.themeColor, settings.chatBackground, settings.fontSize]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, settings);
      localStorage.setItem(`chance_settings_${user.uid}`, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
      // Save to localStorage as fallback
      localStorage.setItem(`chance_settings_${user.uid}`, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="settings-page">
      <div className="settings-bg-effects">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <motion.div
        className="settings-container"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div className="settings-header" variants={fadeUp}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Configure your companion experience</p>
        </motion.div>

        {/* ─── Profile Card ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={1}>
          <h2 className="card-title">Profile</h2>
          <div className="profile-display">
            <div className="profile-avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-info">
              <p className="profile-name">{user?.displayName || 'Anonymous'}</p>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Nicknames ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={2}>
          <h2 className="card-title">Nicknames</h2>

          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="What should your companion call you?"
              value={settings.userName}
              onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">AI Partner Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Name your companion"
              value={settings.aiName}
              onChange={(e) => setSettings({ ...settings, aiName: e.target.value })}
            />
          </div>
        </motion.div>

        {/* ─── Relationship Type ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={3}>
          <h2 className="card-title">Relationship Type</h2>
          <p className="card-desc">Choose how your companion relates to you</p>
          <div className="chips-grid">
            {RELATIONSHIP_TYPES.map((type) => (
              <button
                key={type}
                className={`chip ${settings.relationshipType === type ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, relationshipType: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Personality ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={4}>
          <h2 className="card-title">AI Personality</h2>
          <p className="card-desc">Select your companion's personality style</p>
          <div className="chips-grid">
            {PERSONALITIES.map((p) => (
              <button
                key={p}
                className={`chip ${settings.personality === p ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, personality: p })}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Memory ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={5}>
          <h2 className="card-title">Core Memory</h2>
          <p className="card-desc">Write down anything important you want your companion to permanently remember about you.</p>
          <div className="form-group">
            <textarea
              className="form-input"
              rows={4}
              placeholder="E.g., I love reading sci-fi, I'm allergic to peanuts, my favorite color is neon purple..."
              value={settings.memory || ''}
              onChange={(e) => setSettings({ ...settings, memory: e.target.value })}
            />
          </div>
        </motion.div>

        {/* ─── Appearance ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={6}>
          <h2 className="card-title">Appearance</h2>
          
          <div className="form-group">
            <label className="form-label">Theme Color</label>
            <div className="chips-grid">
              {['neon-purple', 'cyber-blue', 'matrix-green'].map((theme) => (
                <button
                  key={theme}
                  className={`chip ${settings.themeColor === theme ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, themeColor: theme })}
                >
                  {theme.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Chat Background</label>
            <div className="chips-grid">
              {['dotted', 'solid', 'grid'].map((bg) => (
                <button
                  key={bg}
                  className={`chip ${settings.chatBackground === bg ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, chatBackground: bg })}
                >
                  {bg.charAt(0).toUpperCase() + bg.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Font Size</label>
            <div className="chips-grid">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  className={`chip ${settings.fontSize === size ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, fontSize: size })}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── AI Gallery ─── */}
        <motion.div className="settings-card" variants={fadeUp} custom={7}>
          <h2 className="card-title">AI Gallery</h2>
          <p className="card-desc">Add image URLs for the AI to randomly send when asked for a picture.</p>
          
          <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="https://example.com/image.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <button 
              className="btn-primary" 
              style={{ padding: '0 16px', minWidth: 'auto' }}
              onClick={() => {
                if (newImageUrl.trim()) {
                  setSettings({
                    ...settings,
                    galleryUrls: [...(settings.galleryUrls || []), newImageUrl.trim()]
                  });
                  setNewImageUrl('');
                }
              }}
            >
              Add
            </button>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="file"
              accept="image/*"
              id="gallery-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label 
              htmlFor="gallery-upload" 
              className="btn-secondary" 
              style={{ cursor: 'pointer', display: 'inline-block', textAlign: 'center', margin: 0 }}
            >
              Upload from Computer
            </label>
            {uploading && <span style={{ fontSize: '14px', color: 'var(--primary-vibrant)' }}>Uploading {uploadProgress}%...</span>}
          </div>

          <div className="gallery-list" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(settings.galleryUrls || []).map((url, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{url}</span>
                <button 
                  style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                  onClick={() => {
                    const newUrls = [...settings.galleryUrls];
                    newUrls.splice(i, 1);
                    setSettings({ ...settings, galleryUrls: newUrls });
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {(settings.galleryUrls || []).length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--on-surface-muted)', fontStyle: 'italic' }}>No custom URLs added yet. Using default local images.</p>
            )}
          </div>
        </motion.div>

        {/* ─── Actions ─── */}
        <motion.div className="settings-actions" variants={fadeUp} custom={8}>
          <button
            className="btn-primary save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="btn-loading">
                <span className="spinner" /> Saving...
              </span>
            ) : saved ? (
              '✓ Saved!'
            ) : (
              'Save Settings'
            )}
          </button>

          <button className="btn-ghost" onClick={() => navigate('/chat')}>
            → Go to Chat
          </button>

          <button className="btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </motion.div>

        {/* ─── Developer Credits ─── */}
        <motion.div 
          variants={fadeUp} 
          custom={9} 
          style={{ marginTop: '3rem', textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', border: '1px solid var(--primary-border)' }}
        >
          <p style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold', margin: 0, textShadow: '0 0 10px var(--primary-glow)' }}>
            Created by IRSHAD (Developer)
          </p>
          <p style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold', margin: '4px 0' }}>
            Insta id: <a href="https://instagram.com/_irshad__002" target="_blank" rel="noreferrer" style={{color: 'var(--primary-vibrant)', textDecoration: 'none'}}>@_irshad__002</a>
          </p>
          <p style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold', margin: 0 }}>
            Follow for more!
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}
