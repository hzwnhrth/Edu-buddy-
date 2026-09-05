import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineAcademicCap, HiOutlineUser, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { useAppContext } from '../context/AppContext';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/notes': 'Study Materials',
  '/quiz': 'Quiz Arena',
  '/chat': 'AI Tutor',
  '/progress': 'Progress',
  '/teacher-dashboard': 'Teacher Dashboard',
  '/admin-dashboard': 'Admin Dashboard',
};

/**
 * Navbar Component
 * Renders the top navigation bar. It displays the current page title dynamically
 * based on the route, plus a role badge (from the logged-in user when present,
 * else from the active view) and a user avatar with logout.
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAppContext();
  const title = pageTitles[location.pathname] || 'EduBuddy AI';

  const role =
    currentUser?.role === 'teacher' ? 'Teacher'
      : currentUser?.role === 'admin' ? 'Admin'
        : location.pathname.startsWith('/teacher-dashboard') ? 'Teacher'
          : location.pathname.startsWith('/admin-dashboard') ? 'Admin'
            : 'Student';

  const roleStyles = {
    Student: { pillBg: '#DCFCE7', pillBorder: 'rgba(34,197,94,0.25)', pillText: '#16A34A', avatar: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
    Teacher: { pillBg: '#DBEAFE', pillBorder: 'rgba(59,130,246,0.25)', pillText: '#2563EB', avatar: 'linear-gradient(135deg, #3B82F6, #2563EB)', shadow: 'rgba(59, 130, 246, 0.3)' },
    Admin: { pillBg: '#EDE9FE', pillBorder: 'rgba(139,92,246,0.25)', pillText: '#7C3AED', avatar: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', shadow: 'rgba(139, 92, 246, 0.3)' },
  }[role];

  return (
    <header className="navbar">
      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.4rem 0.9rem', borderRadius: '9999px',
            background: roleStyles.pillBg, border: `1px solid ${roleStyles.pillBorder}`,
            fontSize: '0.8rem', fontWeight: 800, color: roleStyles.pillText,
          }}
        >
          {role === 'Teacher' ? <HiOutlineAcademicCap /> : <HiOutlineUser />}
          {role}
        </span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-full)',
            background: roleStyles.avatar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: '700',
            color: '#FFFFFF',
            boxShadow: `0 2px 8px ${roleStyles.shadow}`,
            flexShrink: 0,
          }}
          title={currentUser ? `${currentUser.name} (${role})` : `Guest (${role})`}
        >
          {(currentUser?.name || role).charAt(0).toUpperCase()}
        </div>
        {currentUser ? (
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: '9999px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700,
              color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0,
            }}
            title="Log out"
          >
            <HiOutlineArrowRightOnRectangle /> Logout
          </button>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>Guest</span>
        )}
      </div>
    </header>
  );
}
