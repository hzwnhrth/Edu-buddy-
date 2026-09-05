import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineUserGroup, HiOutlineExclamationCircle, HiOutlineAcademicCap, HiOutlineEye, HiOutlineUser } from 'react-icons/hi2';
import { FaMale, FaFemale } from 'react-icons/fa';
import NotesStudio from '../components/NotesStudio';
import { getTeacherClassroom } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

// Mock data for the Classroom View — 10 students with names, gender and
// mastery percentage. Same shape a real class roster API would return.
const classroomData = [
  { id: 1, name: 'Aiman', gender: 'boy', mastery: 92, status: 'green' },
  { id: 2, name: 'Siti', gender: 'girl', mastery: 88, status: 'green' },
  { id: 3, name: 'Wei Jie', gender: 'boy', mastery: 38, status: 'red' },
  { id: 4, name: 'Priya', gender: 'girl', mastery: 85, status: 'green' },
  { id: 5, name: 'Daniel', gender: 'boy', mastery: 62, status: 'yellow' },
  { id: 6, name: 'Nurul', gender: 'girl', mastery: 90, status: 'green' },
  { id: 7, name: 'Hafiz', gender: 'boy', mastery: 35, status: 'red' },
  { id: 8, name: 'Mei Ling', gender: 'girl', mastery: 58, status: 'yellow' },
  { id: 9, name: 'Arjun', gender: 'boy', mastery: 65, status: 'yellow' },
  { id: 10, name: 'Farah', gender: 'girl', mastery: 87, status: 'green' },
];

const statusMeta = {
  red: { color: '#EF4444', label: 'Immediate Attention' },
  yellow: { color: '#F59E0B', label: 'Needs Practice' },
  green: { color: '#22C55E', label: 'Mastering' },
};

const strugglingStudents = [
  { id: 3, name: 'Wei Jie', topic: 'Chemical Bonding', score: '38%', lastActive: '1d ago' },
  { id: 7, name: 'Hafiz', topic: 'Cell Division (Mitosis)', score: '42%', lastActive: '2h ago' },
  { id: 5, name: 'Daniel', topic: 'Acids & Bases', score: '51%', lastActive: '5h ago' },
  { id: 8, name: 'Mei Ling', topic: 'Photosynthesis', score: '55%', lastActive: '3h ago' },
  { id: 9, name: 'Arjun', topic: 'Electricity & Circuits', score: '58%', lastActive: '1d ago' },
];

/**
 * TeacherDashboard Component
 * Monitors the classroom: mastery cards per student, stats, and the
 * weakness table. Loads real data from /api/teacher/classroom when the
 * backend has it; falls back to the sample roster so the page always
 * demos well on an empty database.
 */
export default function TeacherDashboard() {
  const [live, setLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getTeacherClassroom()
      .then(data => { if (!cancelled && data?.stats) setLive(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const useLiveStudents = live?.students?.length > 0;
  const roster = useLiveStudents
    ? live.students.map(s => ({
        id: s.id,
        name: s.name,
        gender: null,
        mastery: s.mastery ?? 0,
        status: s.status,
      }))
    : classroomData;
  const weaknessRows = useLiveStudents && live.weaknessRows?.length > 0 ? live.weaknessRows : strugglingStudents;
  const stats = useLiveStudents ? live.stats : null;

  return (
    <motion.div
      className="page-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="page-header" variants={itemVariants}>
        <h1>Teacher Dashboard</h1>
        <p>Form 4 Science • Class Overview & Analytics {useLiveStudents && (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.5px', padding: '0.2rem 0.55rem', borderRadius: '9999px', background: '#DCFCE7', color: '#16A34A', verticalAlign: 'middle', marginLeft: '0.4rem' }}>
            LIVE DATA
          </span>
        )}</p>
      </motion.div>

      {/* Top Stats */}
      <motion.div className="stats-grid" variants={itemVariants}>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineUserGroup /></div>
          <div className="stat-info">
            <h3>{stats ? stats.totalStudents : 10}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineExclamationCircle /></div>
          <div className="stat-info">
            <h3 style={{ color: '#EF4444' }}>{stats ? stats.needAttention : 2}</h3>
            <p>Need Attention</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineAcademicCap /></div>
          <div className="stat-info">
            <h3>{stats ? (stats.classAvgScore ?? '—') : 68}{stats && stats.classAvgScore !== null ? '%' : ''}</h3>
            <p>Class Avg Score</p>
          </div>
        </div>
      </motion.div>

      {/* Classroom View: student mastery cards */}
      <motion.div className="card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Classroom View</h2>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {Object.entries(statusMeta).map(([key, meta]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: meta.color }} /> {meta.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1rem',
        }}>
          {roster.map((student) => {
            const meta = statusMeta[student.status];
            return (
              <motion.div
                key={student.id}
                whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(17, 24, 39, 0.08)' }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '16px',
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                title={`${student.name} — ${meta.label}, ${student.mastery}% mastery`}
              >
                {/* Mastery ring avatar */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 0.6rem auto',
                  background: `conic-gradient(${meta.color} ${student.mastery * 3.6}deg, #E5E7EB 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '58px', height: '58px', borderRadius: '50%', background: '#FFFFFF',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                      {student.mastery}%
                    </span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      mastery
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                  {student.gender === 'boy' ? (
                    <FaMale style={{ color: meta.color, fontSize: '0.95rem' }} />
                  ) : student.gender === 'girl' ? (
                    <FaFemale style={{ color: meta.color, fontSize: '0.95rem' }} />
                  ) : (
                    <HiOutlineUser style={{ color: meta.color, fontSize: '0.95rem' }} />
                  )}
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{student.name}</span>
                </div>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  background: `${meta.color}1A`, color: meta.color,
                  fontSize: '0.65rem', fontWeight: 800,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: meta.color }} />
                  {meta.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Lesson Studio: Generate + Approve Notes (Teacher Only) */}
      <motion.div className="card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
        <NotesStudio />
      </motion.div>

      {/* Weakness Analytics Table */}
      <motion.div className="card" variants={itemVariants}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Action Required: Student Weaknesses</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Student</th>
                <th style={{ padding: '1rem' }}>Weak Topic Detected</th>
                <th style={{ padding: '1rem' }}>Avg Score</th>
                <th style={{ padding: '1rem' }}>Last Active</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {weaknessRows.map((s, idx) => (
                <tr key={s.id || `row-${idx}`} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#111827' }}>{s.name}</td>
                  <td style={{ padding: '1rem', color: '#EF4444', fontWeight: 600 }}>{s.topic}</td>
                  <td style={{ padding: '1rem', color: '#6B7280', fontWeight: 600 }}>{s.score}</td>
                  <td style={{ padding: '1rem', color: '#9CA3AF', fontSize: '0.9rem' }}>{s.lastActive}</td>
                  <td style={{ padding: '1rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      <HiOutlineEye /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </motion.div>
  );
}
