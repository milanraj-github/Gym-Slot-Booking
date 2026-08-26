import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ShieldCheck, Zap, Database, Lock } from 'lucide-react';

export function SlotGuardIntro({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="slotguard-aurora-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#040711',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            textAlign: 'center',
            padding: '1.5rem'
          }}
        >
          {/* Glowing Aurora Brand Icon */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.3) 50%, rgba(139, 92, 246, 0.3) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              boxShadow: '0 0 50px rgba(16, 185, 129, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Dumbbell className="w-11 h-11" />
          </motion.div>

          {/* Main Title & Subtitle */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
          >
            <h1
              style={{
                fontSize: '3.1rem',
                fontWeight: 800,
                letterSpacing: '-1px',
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Slot<span style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Guard</span>
            </h1>

            <p style={{ color: '#94a3b8', fontSize: '1.05rem', fontWeight: 600, maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
              Real-Time Capacity Protection & Concurrency Reservation Engine
            </p>
          </motion.div>

          {/* Aurora Feature Badges */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.75rem',
              maxWidth: '580px',
              marginTop: '0.25rem'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '30px',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Overbooking</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '30px',
                background: 'rgba(6, 182, 212, 0.14)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                color: '#06b6d4',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Atomic PostgreSQL Locks</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '30px',
                background: 'rgba(139, 92, 246, 0.14)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#a78bfa',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Redis Hot Cache</span>
            </div>
          </motion.div>

          {/* 2-Second Aurora Gradient Progress Line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '200px' }}
            transition={{ duration: 2, ease: 'linear' }}
            style={{
              height: '3.5px',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)',
              marginTop: '0.5rem'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
