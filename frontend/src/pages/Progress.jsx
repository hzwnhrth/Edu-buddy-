import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HiOutlineTrophy, HiOutlineChartBar, HiOutlineBookOpen, HiOutlineQuestionMarkCircle } from 'react-icons/hi2';

/**
 * CustomTooltip Component
 * Renders the tooltip shown when hovering over the performance chart bars.
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <p style={{ fontWeight: 700, marginBottom: '0.15rem', color: '#111827', fontSize: '0.9rem' }}>{label}</p>
        <p style={{ color: '#22C55E', fontSize: '0.85rem', fontWeight: 600 }}>Score: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
}

/**
 * Progress Component
 * Displays the student's historical data, such as past quiz results and
 * notes generated. It retrieves this data from the global AppContext and
 * renders it in lists/grids.
 */
export default function Progress() {
  const { stats, quizHistory } = useAppContext();

  const statCards = [
    { icon: <HiOutlineBookOpen />, label: 'Notes Generated', value: stats.notesGenerated, color: 'blue' },
    { icon: <HiOutlineChartBar />, label: 'Quizzes Taken', value: stats.quizzesTaken, color: 'purple' },
    { icon: <HiOutlineQuestionMarkCircle />, label: 'Questions Asked', value: stats.questionsAsked, color: 'orange' },
    { icon: <HiOutlineTrophy />, label: 'Average Score', value: `${stats.averageScore}%`, color: 'green' },
  ];

  // Prepare chart data from quiz history
  const chartData = quizHistory
    .slice(0, 10)
    .reverse()
    .map((q, i) => ({
      name: `Quiz ${i + 1}`,
      score: q.percentage || 0,
      correct: q.score || 0,
      total: q.total || 0,
    }));

  const getScoreBadge = (pct) => {
    if (pct >= 70) return { bg: '#DCFCE7', color: '#16A34A', border: 'rgba(34,197,94,0.2)' };
    if (pct >= 50) return { bg: '#FEF3C7', color: '#D97706', border: 'rgba(245,158,11,0.2)' };
    return { bg: '#FEE2E2', color: '#DC2626', border: 'rgba(239,68,68,0.2)' };
  };

  return (
    <motion.div 
      className="page-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="page-header">
        <h1>Your Progress</h1>
        <p>Track your learning journey and see how you&apos;re improving over time.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {statCards.map((s, i) => (
          <motion.div 
            className="stat-card" key={i}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
          >
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
        {/* Quiz Performance Chart */}
        <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: '#111827' }}>Performance Trends</h2>

          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: '#9CA3AF' }}>
                <HiOutlineChartBar />
              </div>
              <h3>No quiz data yet</h3>
              <p>Take some quizzes to see your performance trends here!</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,197,94,0.05)' }} />
                  <Bar
                    dataKey="score"
                    fill="url(#greenBarGradient)"
                    radius={[6, 6, 6, 6]}
                    maxBarSize={36}
                  />
                  <defs>
                    <linearGradient id="greenBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Recent Quizzes List */}
        <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: '#111827' }}>Recent Quizzes</h2>
          {quizHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
              <p style={{ color: '#6B7280' }}>No quizzes taken yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {quizHistory.slice(0, 5).map((q, i) => {
                const badge = getScoreBadge(q.percentage);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                    <div style={{ 
                      width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: badge.bg, color: badge.color,
                      fontWeight: 800, fontSize: '0.8rem', border: `1px solid ${badge.border}`,
                      flexShrink: 0
                    }}>
                      {q.percentage}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                        {q.topic || `Quiz ${quizHistory.length - i}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {q.score}/{q.total} correct • {q.difficulty || 'medium'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                      {q.timestamp ? new Date(q.timestamp).toLocaleDateString() : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
