import { useLocation } from 'react-router-dom';

import { HiOutlineSparkles } from 'react-icons/hi2';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/notes': 'Notes Generator',
  '/quiz': 'Quiz Arena',
  '/chat': 'AI Tutor',
  '/progress': 'Progress',
};

export default function Navbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'EduBuddy AI';

  return (
    <header className="navbar">
      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-actions">
        <span className="sdg-badge">
          <HiOutlineSparkles style={{ color: '#22C55E' }} /> SDG 4: Quality Education
        </span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: '700',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
          }}
        >
          S
        </div>
      </div>
    </header>
  );
}
