import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineDocumentText, HiOutlineLightBulb, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlineArrowUpTray, HiOutlineBookOpen, HiOutlineTrophy } from 'react-icons/hi2';

const features = [
  { icon: <HiOutlineDocumentText />, title: 'Smart Notes', desc: 'Upload any PDF and get AI-generated study notes, summaries, and flashcards instantly.', color: '#3B82F6', bg: '#DBEAFE' },
  { icon: <HiOutlineLightBulb />, title: 'Adaptive Quizzes', desc: 'Test your knowledge with AI-generated quizzes that adapt to your difficulty preference.', color: '#8B5CF6', bg: '#EDE9FE' },
  { icon: <HiOutlineChatBubbleLeftRight />, title: 'AI Tutor Chat', desc: 'Ask questions and get clear, contextual explanations from your personal AI tutor.', color: '#F97316', bg: '#FFF7ED' },
  { icon: <HiOutlineAcademicCap />, title: 'Track Progress', desc: 'Monitor your study streak, quiz scores, and identify areas that need more attention.', color: '#22C55E', bg: '#DCFCE7' },
];

const steps = [
  { num: '1', icon: <HiOutlineArrowUpTray />, title: 'Upload Notes', desc: 'Drop your lecture PDFs or paste your study material', color: '#3B82F6', bg: '#DBEAFE' },
  { num: '2', icon: <HiOutlineBookOpen />, title: 'Study Smart', desc: 'AI generates notes, flashcards, and quizzes for you', color: '#8B5CF6', bg: '#EDE9FE' },
  { num: '3', icon: <HiOutlineTrophy />, title: 'Master It', desc: 'Track progress and ace your exams with confidence', color: '#22C55E', bg: '#DCFCE7' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

/**
 * Landing Page Component
 * The first screen users see when they visit the app (the hero section).
 * It introduces the app, its features, and provides a "Get Started" button
 * that redirects to the Dashboard.
 */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFBFC' }}>
      {/* Hero Section */}
      <motion.div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 2rem 4rem 2rem', position: 'relative' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Decorative dots background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.5 }} />

        <div className="hero-led-box" style={{ 
          maxWidth: '840px', 
          zIndex: 1, 
          position: 'relative',
          background: '#FFFFFF',
          padding: '4rem 3rem',
          borderRadius: '32px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.03)',
          width: '100%'
        }}>
          <motion.img 
            src="/edubuddy_full_logo.svg" 
            alt="EduBuddy Logo"
            style={{ display: 'block', margin: '0 auto 1.5rem auto', maxWidth: '240px', width: '100%', height: 'auto' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          />
          
          <motion.div 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', borderRadius: '9999px', background: '#DCFCE7', border: '1px solid rgba(34,197,94,0.2)', color: '#16A34A', marginBottom: '2rem', fontSize: '0.85rem', fontWeight: 700 }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <HiOutlineBookOpen /> Master your subjects faster
          </motion.div>
          
          <motion.h1 
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.03em', color: '#111827' }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 80 }}
          >
            Your Intelligent<br />
            <span style={{ background: 'linear-gradient(135deg, #22C55E, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Study Platform</span>
          </motion.h1>
          
          <motion.p 
            style={{ fontSize: '1.15rem', color: '#6B7280', marginBottom: '2.5rem', maxWidth: '560px', margin: '0 auto 2.5rem auto', lineHeight: 1.7 }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 80 }}
          >
            One website for smart note summaries, personalized quizzes, and an AI tutor that's always ready to help.
          </motion.p>
          
          <motion.div 
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 80 }}
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '9999px' }}
              onClick={() => navigate('/login')}
            >
              <HiOutlineBookOpen /> Get Started Free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '9999px' }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={containerVariants}
        style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto', width: '100%', textAlign: 'center' }}
      >
        <motion.h2 variants={itemVariants} style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>
          How It Works
        </motion.h2>
        <motion.p variants={itemVariants} style={{ color: '#6B7280', marginBottom: '2.5rem', fontSize: '1rem' }}>
          Three simple steps to supercharge your studying
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {steps.map((s, i) => (
            <motion.div 
              variants={itemVariants} 
              key={i}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
              transition={{ duration: 0.3 }}
              style={{ padding: '2rem', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1.25rem auto', color: s.color }}>
                {s.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>{s.title}</h3>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', padding: '2rem 2rem 4rem 2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}
      >
        {features.map((f, i) => (
          <motion.div 
            variants={itemVariants} 
            key={i}
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', padding: '2rem', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', color: f.color }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>{f.title}</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem', borderTop: '1px solid #E5E7EB', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <div>Built for <strong>Hackathon Sedia!</strong></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: '#DCFCE7', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '9999px', color: '#16A34A', fontWeight: 700 }}>
          <HiOutlineSparkles /> SDG 4: Quality Education
        </div>
      </div>
    </div>
  );
}
