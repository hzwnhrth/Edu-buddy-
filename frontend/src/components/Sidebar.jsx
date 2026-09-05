import { NavLink } from 'react-router-dom';
import { HiOutlineHome, HiOutlineDocumentText, HiOutlineLightBulb, HiOutlineChatBubbleLeftRight, HiOutlineChartBar } from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/notes', icon: HiOutlineDocumentText, label: 'Notes Generator' },
  { to: '/quiz', icon: HiOutlineLightBulb, label: 'Quiz Arena' },
  { to: '/chat', icon: HiOutlineChatBubbleLeftRight, label: 'AI Tutor' },
  { to: '/progress', icon: HiOutlineChartBar, label: 'Progress' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
        <img 
          src="/edubuddy_full_logo.svg" 
          alt="EduBuddy Logo" 
          style={{ width: '100%', maxWidth: '160px', height: 'auto', objectFit: 'contain' }} 
        />
      </NavLink>

      <nav className="sidebar-nav">
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
      </nav>

      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', fontWeight: 600 }}>
          EduBuddy v1.0
        </div>
      </div>
    </aside>
  );
}
