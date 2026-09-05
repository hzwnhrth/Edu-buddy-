import { motion } from 'framer-motion';
import { HiOutlineUserGroup, HiOutlineExclamationCircle, HiOutlineAcademicCap, HiOutlineEye } from 'react-icons/hi2';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
};

// Mock data for the "Cinema Concept" classroom grid
const classroomData = Array.from({ length: 30 }, (_, i) => {
  // 5 students struggling (Red), 10 doing okay (Yellow), 15 excelling (Green)
  let status = 'green';
  if ([2, 7, 14, 21, 28].includes(i)) status = 'red';
  else if ([4, 9, 11, 15, 18, 22, 23, 25, 27, 29].includes(i)) status = 'yellow';
  
  return { id: i + 1, name: `Student ${i + 1}`, status };
});

const strugglingStudents = [
  { id: 3, name: 'Student 3', topic: 'Cell Division (Mitosis)', score: '42%', lastActive: '2h ago' },
  { id: 8, name: 'Student 8', topic: 'Algebraic Expressions', score: '38%', lastActive: '1d ago' },
  { id: 15, name: 'Student 15', topic: 'Chemical Bonding', score: '45%', lastActive: '5h ago' },
  { id: 22, name: 'Student 22', topic: 'Cell Division (Meiosis)', score: '41%', lastActive: '3h ago' },
  { id: 29, name: 'Student 29', topic: 'Trigonometry', score: '35%', lastActive: '4d ago' },
];

/**
 * TeacherDashboard Component
 * Provides a mock view for teachers to monitor their classroom.
 * Features a "Cinema Concept" visual layout showing which students are struggling (red),
 * doing okay (yellow), or excelling (green). Uses static mock data for demonstration.
 */
export default function TeacherDashboard() {
  return (
    <motion.div 
      className="page-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="page-header" variants={itemVariants}>
        <h1>Teacher Dashboard</h1>
        <p>Form 4 Science • Class Overview & Analytics</p>
      </motion.div>

      {/* Top Stats */}
      <motion.div className="stats-grid" variants={itemVariants}>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineUserGroup /></div>
          <div className="stat-info">
            <h3>30</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineExclamationCircle /></div>
          <div className="stat-info">
            <h3 style={{ color: '#EF4444' }}>5</h3>
            <p>Need Attention</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineAcademicCap /></div>
          <div className="stat-info">
            <h3>78%</h3>
            <p>Class Avg Score</p>
          </div>
        </div>
      </motion.div>

      {/* Cinema Concept Classroom View */}
      <motion.div className="card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Classroom Mastery (Cinema View)</h2>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: '#EF4444' }} /> Immediate Attention
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: '#F59E0B' }} /> Needs Practice
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: '#22C55E' }} /> Mastering
            </span>
          </div>
        </div>

        {/* The Grid (Desks) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(10, 1fr)', 
          gap: '1rem',
          background: '#FAFBFC',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #E5E7EB'
        }}>
          {classroomData.map((student) => (
            <div 
              key={student.id}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                background: student.status === 'red' ? '#EF4444' : student.status === 'yellow' ? '#F59E0B' : '#22C55E',
                boxShadow: student.status === 'red' ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              title={`${student.name} - ${student.status.toUpperCase()}`}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {student.id}
            </div>
          ))}
        </div>
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
              {strugglingStudents.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
