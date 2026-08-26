import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ArrowRight } from 'lucide-react';

export function SlotGuardIntro({ onComplete }) {
  const [visible, setVisible] = useState(true);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    // Phase 4: Reveal CTA after branding and progress animation (1.8s)
    const ctaTimer = setTimeout(() => {
      setShowCTA(true);
    }, 1800);

    // Auto-proceed fallback if user doesn't click after 5.5s
    const autoTimer = setTimeout(() => {
      handleEnter();
    }, 5500);

    return () => {
      clearTimeout(ctaTimer);
      clearTimeout(autoTimer);
    };
  }, []);

  const handleEnter = () => {
    setVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="slotguard-cinematic-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#040711',
            backgroundImage: 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.1) 0%, rgba(4, 7, 17, 0.98) 75%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            userSelect: 'none'
          }}
        >
          {/* Main Centered Branding Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '520px',
              width: '100%'
            }}
          >
            {/* PHASE 2 — Monogram Badge */}
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                background: 'rgba(10, 16, 30, 0.75)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                boxShadow: '0 0 35px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                marginBottom: '1.5rem'
              }}
            >
              <Dumbbell className="w-9 h-9" />
            </motion.div>

            {/* PHASE 2 — Project Name (SLOTGUARD) */}
            <motion.h1
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: '2.85rem',
                fontWeight: 800,
                letterSpacing: '-0.75px',
                color: '#ffffff',
                lineHeight: 1.1,
                marginBottom: '0.6rem'
              }}
            >
              Slot<span style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Guard</span>
            </motion.h1>

            {/* PHASE 2 — Tagline */}
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                color: '#94a3b8',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '2rem'
              }}
            >
              BOOK SMART. STAY ACTIVE.
            </motion.p>

            {/* PHASE 3 — Minimal Horizontal Progress Line */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '130px', opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '2px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                marginBottom: '2.5rem'
              }}
            />

            {/* PHASE 4 — Enter CTA Button */}
            <AnimatePresence>
              {showCTA && (
                <motion.div
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(16, 185, 129, 0.45)' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleEnter}
                    style={{
                      padding: '0.85rem 1.85rem',
                      borderRadius: '30px',
                      background: 'rgba(10, 16, 30, 0.85)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <span>ENTER SLOTGUARD</span>
                    <ArrowRight className="w-4 h-4 text-emerald" style={{ color: '#10b981' }} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
