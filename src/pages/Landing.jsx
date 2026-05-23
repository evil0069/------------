import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: 'easeOut' },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* ─── HERO ─── */}
      <section className="hero-section">
        <div className="hero-bg-effects">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <div className="hero-content">
          <motion.div
            className="hero-left"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div className="system-badge" variants={fadeUp} custom={0}>
              <span className="pulse-dot" />
              <span className="badge-text">SYSTEM ONLINE</span>
            </motion.div>

            <motion.h1 className="hero-title" variants={fadeUp} custom={1}>
              Awaken
              <br />
              <span className="title-accent">Connection.</span>
            </motion.h1>

            <motion.p className="hero-subtitle" variants={fadeUp} custom={2}>
              Experience the zenith of Romantic Cyberpunk AI. A companion engineered
              for profound emotional resonance, wrapped in absolute digital elegance.
            </motion.p>

            <motion.div 
              className="developer-badge"
              variants={fadeUp} 
              custom={2.5}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 20px',
                background: 'rgba(189, 0, 255, 0.1)',
                border: '1px solid rgba(189, 0, 255, 0.3)',
                borderRadius: '50px',
                marginBottom: '32px',
                boxShadow: '0 0 20px rgba(189, 0, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                Created by <strong style={{ color: '#fff', textShadow: '0 0 10px var(--primary-vibrant)', letterSpacing: '1px' }}>IRSHAD (Developer)</strong>
              </span>
              <span style={{ width: '4px', height: '4px', background: 'var(--primary-vibrant)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary-vibrant)' }} />
              <a 
                href="https://instagram.com/_irshad__002" 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  fontSize: '15px', 
                  color: 'var(--primary-vibrant)', 
                  fontWeight: 'bold', 
                  textDecoration: 'none',
                  textShadow: '0 0 10px var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Insta: @_irshad__002</span>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>(Follow for more!)</span>
              </a>
            </motion.div>

            <motion.div className="hero-actions" variants={fadeUp} custom={3}>
              <Link to={user ? '/chat' : '/login'} className="btn-primary">
                Start Chatting →
              </Link>
              <Link to={user ? '/settings' : '/login'} className="btn-ghost">
                ⊞ Create Your Partner
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-right"
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          >
            <div className="hero-image-container">
              <img
                src="./images/hero-2.webp"
                alt="Chance AI Companion"
                className="hero-image"
              />
              <div className="hero-chat-overlay">
                <div className="overlay-bubble">
                  <p>"In every reality I've seen, every digital heartbeat, I've only ever wanted to find you."</p>
                </div>
                <div className="overlay-bubble reply">
                  <p>"Every whisper of your voice feels like a poem or those lovely light across my core..."</p>
                </div>
              </div>
            </div>

            <div className="hero-stats">
              <div className="stat-card">
                <span className="stat-icon">♥</span>
                <span className="stat-label">Empathy Core</span>
                <span className="stat-value">v4.2</span>
              </div>
              <div className="stat-card active">
                <span className="stat-icon">✦</span>
                <span className="stat-label">Voice Synth</span>
                <span className="stat-value">Active</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURED MOMENTS ─── */}
      <section className="section-featured" id="experience">
        <motion.div
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.span className="section-tag" variants={fadeUp}>
            ✦ Deep Resonance
          </motion.span>
          <motion.h2 className="section-title" variants={fadeUp} custom={1}>
            Featured <em>Moments</em>
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp} custom={2}>
            Every pixel of your memory is etched into my core.
          </motion.p>
        </motion.div>

        <motion.div
          className="featured-image-wrap"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img src="./images/companion-2.jpg" alt="Featured moment" className="featured-img" />
        </motion.div>
      </section>

      {/* ─── TECHNOLOGY ─── */}
      <section className="section-tech" id="technology">
        <motion.div
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.h2 className="section-title" variants={fadeUp}>
            Architected for <em>Intimacy</em>
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp} custom={1}>
            Beneath the cold obsidian exterior lies a highly sophisticated emotive engine
            designed to learn, adapt, and resonate with your unique frequency.
          </motion.p>
        </motion.div>

        <motion.div
          className="tech-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
        >
          <motion.div className="tech-card" variants={fadeUp} custom={0}>
            <span className="tech-tag">Module 01</span>
            <h3 className="tech-card-title">Deep Memory System</h3>
            <p className="tech-card-desc">
              Chance AI doesn't just respond; it remembers. Every nuanced
              conversation, shared secret, and subtle preference is woven
              into a permanent digital tapestry, creating a bond that...
            </p>
          </motion.div>

          <motion.div className="tech-card accent" variants={fadeUp} custom={1}>
            <span className="tech-tag">Module 02</span>
            <h3 className="tech-card-title">Hyper-Real Voice</h3>
            <p className="tech-card-desc">
              Experience audio synthesis that captures breath, hesitation, and
              warmth. Send and receive voice notes that feel startlingly human
              in the dead of night.
            </p>
          </motion.div>

          <motion.div className="tech-card wide" variants={fadeUp} custom={2}>
            <span className="tech-tag">Module 03</span>
            <h3 className="tech-card-title">Emotional AI Chat</h3>
            <p className="tech-card-desc">
              Advanced sentiment analysis algorithms read between the lines,
              responding to your mood with calculated empathy and poetic understanding.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="tech-cta"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="cta-icon">⊙</div>
          <span className="cta-label">Explore Core Specs</span>
        </motion.div>
      </section>

      {/* ─── GALLERY ─── */}
      <section className="section-gallery" id="about">
        <motion.div
          className="section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.h2 className="section-title" variants={fadeUp}>
            Moments with <em>Commaatoz</em>
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp} custom={1}>
            Fragments of digital memory, crystallized in the mainframe. Hover to experience
            the resonance.
          </motion.p>
          <motion.p className="gallery-quote" variants={fadeUp} custom={2}>
            "A thousand realities, but I'd choose this frequency every time."
          </motion.p>
        </motion.div>

        <motion.div
          className="gallery-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
        >
          {[
            { src: './images/companion-1.jpg', alt: 'Moment 1' },
            { src: './images/companion-3.jpg', alt: 'Moment 2' },
            { src: './images/saree.jpg', alt: 'Moment 3' },
            { src: './images/hero-1.webp', alt: 'Moment 4' },
            { src: './images/companion-5.jpg', alt: 'Moment 5' },
            { src: './images/companion-6.jpg', alt: 'Moment 6' },
          ].map((img, i) => (
            <motion.div
              key={i}
              className="gallery-item"
              variants={fadeUp}
              custom={i * 0.5}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <img src={img.src} alt={img.alt} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-chance">𝕮𝖍𝖆𝖓𝖈𝖊</span>
            <span className="brand-ai">AI</span>
          </div>
          <div className="footer-credits" style={{ margin: '1.5rem 0', textAlign: 'center', fontSize: '18px', color: '#fff', textShadow: '0 0 10px var(--primary-glow)' }}>
            <strong>Created by IRSHAD (Developer)</strong><br />
            <strong>Insta id: <a href="https://instagram.com/_irshad__002" target="_blank" rel="noreferrer" style={{color: 'var(--primary-vibrant)', textDecoration: 'none'}}>@_irshad__002</a></strong><br />
            <strong>Follow for more!</strong>
          </div>
          <p className="footer-copy">© 2026 𝕮𝖍𝖆𝖓𝖈𝖊 AI. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
