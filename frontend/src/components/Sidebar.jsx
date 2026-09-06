import { NavLink } from 'react-router-dom';
import { HiOutlineHome, HiOutlineDocumentText, HiOutlineLightBulb, HiOutlineChatBubbleLeftRight, HiOutlineChartBar } from 'react-icons/hi2';
import { useAppContext } from '../context/AppContext';

const navItems = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/notes', icon: HiOutlineDocumentText, label: 'Study Materials' },
  { to: '/quiz', icon: HiOutlineLightBulb, label: 'Quiz Arena' },
  { to: '/chat', icon: HiOutlineChatBubbleLeftRight, label: 'AI Tutor' },
  { to: '/progress', icon: HiOutlineChartBar, label: 'Progress' },
];

/**
 * Sidebar Component
 * Renders the side navigation menu. Contains links to all the main features
 * (Dashboard, Study Materials, etc.) and the Demo Views switcher at the bottom.
 */
export default function Sidebar() {
  const { currentUser } = useAppContext();
  const isStudent = currentUser?.role === 'student';
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
        <img 
          src="/edubuddy_full_logo.svg" 
          alt="EduBuddy Logo" 
          style={{ width: '100%', maxWidth: '160px', height: 'auto', objectFit: 'contain' }} 
        />
      </NavLink>

      {isStudent && <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="nav-item-icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>}

      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '0.25rem' }}>
          Workspace
        </div>
        {currentUser?.role === 'student' && <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Student Dashboard</NavLink>}
        {currentUser?.role === 'teacher' && <NavLink to="/teacher-dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Teacher Dashboard</NavLink>}
        {currentUser?.role === 'admin' && <NavLink to="/admin-dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Admin Dashboard</NavLink>}
      </div>
    </aside>
  );
}
