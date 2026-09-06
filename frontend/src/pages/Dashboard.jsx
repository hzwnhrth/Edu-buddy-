import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { HiOutlineDocumentText, HiOutlineLightBulb, HiOutlineChatBubbleLeftRight, HiOutlineChartBar, HiOutlineTrophy, HiOutlineBookOpen, HiOutlineQuestionMarkCircle, HiOutlineFire } from 'react-icons/hi2';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } }
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning' };
  if (hour < 17) return { text: 'Good afternoon' };
  return { text: 'Good evening' };
}

/**
 * Dashboard Component
 * The main hub for the student. It displays their high-level stats (streak, 
 * quizzes taken, average score) and provides quick links/buttons to jump 
 * into the main features of the app (Notes, Quizzes, Chat).
 */
export default function Dashboard() {
  const { stats, approvedNotes, quizHistory } = useAppContext();
  const greeting = getGreeting();

  const statCards = [
    { icon: <HiOutlineBookOpen />, label: 'Study Materials', value: approvedNotes.length, color: 'blue' },
    { icon: <HiOutlineLightBulb />, label: 'Quizzes Taken', value: stats.quizzesTaken, color: 'purple' },
    { icon: <HiOutlineQuestionMarkCircle />, label: 'Questions Asked', value: stats.questionsAsked, color: 'orange' },
    { icon: <HiOutlineTrophy />, label: 'Avg. Score', value: `${stats.averageScore}%`, color: 'green' },
  ];

  const quickActions = [
    { to: '/notes', icon: <HiOutlineDocumentText />, title: 'Study Materials', desc: 'Teacher-approved notes', color: '#3B82F6', bg: '#DBEAFE' },
    { to: '/quiz', icon: <HiOutlineLightBulb />, title: 'Start a Quiz', desc: 'Test your knowledge', color: '#8B5CF6', bg: '#EDE9FE' },
    { to: '/chat', icon: <HiOutlineChatBubbleLeftRight />, title: 'Ask AI Tutor', desc: 'Get explanations', color: '#F97316', bg: '#FFF7ED' },
    { to: '/progress', icon: <HiOutlineChartBar />, title: 'View Progress', desc: 'Track your scores', color: '#22C55E', bg: '#DCFCE7' },
  ];

  return (
    <motion.div 
      className="page-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Greeting */}
      <motion.div className="page-header" variants={itemVariants}>
        <h1>{greeting.text}</h1>
        <p>Ready to continue your study session? Pick up where you left off.</p>
      </motion.div>

      {/* Study Streak */}
      <motion.div className="streak-card" variants={itemVariants}>
        <div className="streak-flame">
          <HiOutlineFire style={{ color: '#F97316' }} />
        </div>
        <div className="streak-info">
          <h3>{stats.studyStreak || 0} Day Streak</h3>
          <p>Keep it going - consistency is the key to mastery</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="stats-grid" variants={containerVariants}>
        {statCards.map((s, i) => (
          <motion.div className="stat-card" key={i} variants={itemVariants}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>Quick Actions</h2>
      </motion.div>
      <motion.div 
        variants={containerVariants}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}
      >
        {quickActions.map((a, i) => (
          <motion.div variants={itemVariants} key={i}>
            <Link to={a.to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', cursor: 'pointer' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', color: a.color, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{a.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>{a.desc}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>Recent Activity</h2>
      </motion.div>
      <motion.div className="card" variants={itemVariants}>
        {quizHistory.length === 0 && approvedNotes.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#9CA3AF' }}>
              <HiOutlineBookOpen />
            </div>
            <h3>No activity yet</h3>
            <p style={{ marginBottom: '1.25rem' }}>Check your study materials or take a quiz to get started.</p>
            <Link to="/quiz" className="btn btn-primary" style={{ borderRadius: '9999px' }}>
              <HiOutlineLightBulb /> Take a Quiz
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...quizHistory.slice(0, 3).map(q => ({
              type: 'quiz',
              title: `Quiz: ${q.topic || 'Study Material'}`,
              detail: `Score: ${q.score}/${q.total} (${q.percentage}%)`,
              time: q.timestamp,
              icon: <HiOutlineLightBulb />,
              color: q.percentage >= 70 ? '#22C55E' : q.percentage >= 50 ? '#F59E0B' : '#EF4444',
            })), ...approvedNotes.slice(0, 3).map(n => ({
              type: 'notes',
              title: `Notes: ${n.notes?.title || 'Study Notes'}`,
              detail: `${n.flashcards?.length || 0} flashcards • Teacher approved`,
              time: n.approvedAt,
              icon: <HiOutlineDocumentText />,
              color: '#3B82F6',
            }))].sort((a, b) => b.time - a.time).slice(0, 5).map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 1rem', borderRadius: '12px',
                background: '#F9FAFB', border: '1px solid #F3F4F6',
              }}>
                <span style={{ fontSize: '1.35rem', background: '#FFFFFF', padding: '0.6rem', borderRadius: '10px', border: '1px solid #E5E7EB', color: item.color }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                  {new Date(item.time).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
