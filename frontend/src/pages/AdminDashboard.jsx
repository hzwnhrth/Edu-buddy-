import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineBuildingLibrary, HiOutlineExclamationTriangle, HiOutlineChartPie, HiOutlineUsers, HiOutlineBell, HiOutlineCalendarDays, HiOutlineShoppingCart, HiOutlineCheckCircle, HiOutlineArrowPath, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { getAdminOverview } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

// Mock data - same shape the real admin API will return from the database,
// so swapping the source later requires no page changes.
const resourceAlerts = [
  {
    id: 1, priority: 'High', subject: 'Form 4 Science', teacher: 'Mr. Ahmad',
    issue: '65% of students failing recent quizzes',
    recommendation: 'Allocate 2 more AI Tutor licenses or provide supplementary reading materials.',
    remedial: { day: 'Saturday', time: '10:00 AM', room: 'Science Lab 2' },
    licenses: 2,
  },
  {
    id: 2, priority: 'Medium', subject: 'Form 5 Mathematics', teacher: 'Ms. Lim',
    issue: 'Students struggling with Calculus',
    recommendation: 'Schedule a weekend remedial class.',
    remedial: { day: 'Sunday', time: '9:00 AM', room: 'Room 3B' },
    licenses: 1,
  },
  {
    id: 3, priority: 'Low', subject: 'Form 3 History', teacher: 'Mr. Raj',
    issue: 'Low engagement with generated notes',
    recommendation: 'Review syllabus alignment with teachers.',
    remedial: { day: 'Wednesday', time: '3:30 PM', room: 'Room 1A' },
    licenses: 1,
  },
];

const actionTypes = [
  { key: 'notified', label: 'Notify Teacher', icon: <HiOutlineBell /> },
  { key: 'scheduled', label: 'Schedule Class', icon: <HiOutlineCalendarDays /> },
  { key: 'licenses', label: 'Buy Licenses', icon: <HiOutlineShoppingCart /> },
];

// One tailored outcome per action, built from the alert's own data fields -
// change the data (e.g. real teacher names from the database) and these
// messages update automatically.
function actionMessage(alert, actionKey) {
  switch (actionKey) {
    case 'notified':
      return `${alert.teacher} (${alert.subject}) has been notified by email about this issue.`;
    case 'scheduled':
      return `Remedial class for ${alert.subject} booked - ${alert.remedial.day}, ${alert.remedial.time}, ${alert.remedial.room}.`;
    case 'licenses':
      return `${alert.licenses} AI Tutor license${alert.licenses > 1 ? 's' : ''} requested for ${alert.subject} - sent to next month's budget approval.`;
    default:
      return 'Handled.';
  }
}

/**
 * AdminDashboard Component
 * A high-level mock view for school administrators.
 * Shows school-wide metrics and resource allocation alerts that can be
 * actioned with one click, undone, and reviewed in an audit log.
 */
export default function AdminDashboard() {
  const [actioned, setActioned] = useState({});
  const [filter, setFilter] = useState('all');
  const [log, setLog] = useState([]);
  const [live, setLive] = useState(null);

  // Real school-wide data when the backend has it; mock alerts as fallback
  // so the page always demos well, even on a fresh empty database.
  useEffect(() => {
    let cancelled = false;
    getAdminOverview()
      .then(data => { if (!cancelled && data?.stats) setLive(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const alertsSource = live?.alerts?.length > 0 ? live.alerts : resourceAlerts;
  const stats = live?.stats;

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleAction = (alert, actionKey) => {
    setActioned(prev => ({ ...prev, [alert.id]: actionKey }));
    setLog(prev => [{ time: now(), text: actionMessage(alert, actionKey) }, ...prev]);
  };

  const handleUndo = (alert) => {
    const actionKey = actioned[alert.id];
    setActioned(prev => {
      const next = { ...prev };
      delete next[alert.id];
      return next;
    });
    const label = actionTypes.find(t => t.key === actionKey)?.label || 'action';
    setLog(prev => [{ time: now(), text: `Undid "${label}" on ${alert.subject}.` }, ...prev]);
  };

  const openCount = alertsSource.filter(a => !actioned[a.id]).length;
  const actionedCount = alertsSource.length - openCount;
  const filters = [
    { key: 'all', label: `All (${alertsSource.length})` },
    { key: 'open', label: `Open (${openCount})` },
    { key: 'actioned', label: `Actioned (${actionedCount})` },
  ];
  const visibleAlerts = alertsSource.filter(a =>
    filter === 'all' ? true : filter === 'open' ? !actioned[a.id] : Boolean(actioned[a.id])
  );

  return (
    <motion.div
      className="page-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="page-header" variants={itemVariants}>
        <h1>School Administrator Dashboard</h1>
        <p>Global Analytics & Resource Allocation</p>
      </motion.div>

      {/* Global Stats */}
      <motion.div className="stats-grid" variants={itemVariants}>
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineBuildingLibrary /></div>
          <div className="stat-info">
            <h3>{stats ? stats.activeClasses : 42}</h3>
            <p>Active Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineUsers /></div>
          <div className="stat-info">
            <h3>{stats ? stats.totalStudents.toLocaleString() : '1,204'}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineChartPie /></div>
          <div className="stat-info">
            <h3>{stats ? (stats.schoolAvgScore ?? '-') : '82%'}{stats && stats.schoolAvgScore !== null ? '%' : ''}</h3>
            <p>School Avg Score {stats ? `· ${stats.quizzesTaken} quizzes` : ''}</p>
          </div>
        </div>
      </motion.div>

      {/* Resource Allocation Alerts */}
      <motion.div className="card" variants={itemVariants}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HiOutlineExclamationTriangle style={{ fontSize: '1.5rem', color: '#EF4444' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Resource Allocation Alerts</h2>
            {live && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.5px', padding: '0.2rem 0.55rem', borderRadius: '9999px', background: live.alerts?.length ? '#DCFCE7' : '#F3F4F6', color: live.alerts?.length ? '#16A34A' : '#9CA3AF' }}>
                {live.alerts?.length ? 'LIVE DATA' : 'LIVE · no alerts yet, showing sample'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '9999px', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
                  border: filter === f.key ? '2px solid #16A34A' : '2px solid #E5E7EB',
                  background: filter === f.key ? '#DCFCE7' : '#FFFFFF',
                  color: filter === f.key ? '#16A34A' : '#6B7280',
                  transition: '0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleAlerts.length === 0 && (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.9rem' }}>
              Nothing here - {filter === 'open' ? 'all alerts have been actioned.' : 'no actioned alerts yet.'}
            </p>
          )}
          {visibleAlerts.map((alert) => {
            const action = actioned[alert.id];
            return (
              <div key={alert.id} style={{
                padding: '1.5rem',
                borderLeft: `4px solid ${action ? '#22C55E' : alert.priority === 'High' ? '#EF4444' : alert.priority === 'Medium' ? '#F59E0B' : '#3B82F6'}`,
                background: action ? '#F0FDF4' : '#FAFBFC',
                borderRadius: '8px',
                borderTop: '1px solid #E5E7EB',
                borderRight: '1px solid #E5E7EB',
                borderBottom: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{alert.subject}</h3>
                  {action ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#DCFCE7',
                      color: '#16A34A',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}>
                      <HiOutlineCheckCircle /> Actioned: {actionTypes.find(t => t.key === action)?.label}
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: alert.priority === 'High' ? '#FEE2E2' : alert.priority === 'Medium' ? '#FEF3C7' : '#DBEAFE',
                      color: alert.priority === 'High' ? '#B91C1C' : alert.priority === 'Medium' ? '#B45309' : '#1D4ED8'
                    }}>
                      {alert.priority} Priority
                    </span>
                  )}
                </div>
                <p style={{ color: action ? '#16A34A' : '#EF4444', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Issue: {alert.issue}</p>
                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>Recommendation:</strong> {alert.recommendation}</p>

                <div style={{ marginTop: '1rem' }}>
                  {action ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <p style={{ color: '#16A34A', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <HiOutlineCheckCircle /> {actionMessage(alert, action)}
                      </p>
                      <button
                        onClick={() => handleUndo(alert)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: '#6B7280', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          textDecoration: 'underline',
                        }}
                        title="Reopen this alert"
                      >
                        <HiOutlineArrowPath /> Undo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {actionTypes.map(t => (
                        <button
                          key={t.key}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={() => handleAction(alert, t.key)}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Activity Log */}
      <motion.div className="card" variants={itemVariants} style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <HiOutlineClipboardDocumentList style={{ fontSize: '1.5rem', color: '#3B82F6' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Activity Log</h2>
          <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>Every admin decision is timestamped and auditable</span>
        </div>
        {log.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>No actions taken yet this session. Action an alert above and it will be recorded here.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {log.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.7rem 1rem', borderRadius: '10px',
                background: '#F9FAFB', border: '1px solid #F3F4F6',
              }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, color: '#16A34A',
                  background: '#DCFCE7', padding: '0.2rem 0.55rem', borderRadius: '9999px',
                  flexShrink: 0,
                }}>
                  {entry.time}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>{entry.text}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}
