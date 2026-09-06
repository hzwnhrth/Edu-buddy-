import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import StudyMaterials from './pages/StudyMaterials';
import QuizArena from './pages/QuizArena';
import TutorChat from './pages/TutorChat';
import Progress from './pages/Progress';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

/**
 * AppLayout Component
 * Handles the main layout of the application, including the Sidebar and Navbar.
 * It also manages routing between different pages. If the user is on the root path ('/'),
 * it renders the Landing page without the Sidebar/Navbar wrapper.
 */
const homeForRole = { student: '/dashboard', teacher: '/teacher-dashboard', admin: '/admin-dashboard' };

function ProtectedRoute({ roles, children }) {
  const { authReady, currentUser } = useAppContext();
  if (!authReady) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to={homeForRole[currentUser.role]} replace />;
  }
  return children;
}

function AppLayout() {
  const location = useLocation();
  const { authReady, currentUser } = useAppContext();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/signup';

  if (isLanding) {
    return <Landing />;
  }

  if (isAuth) {
    if (!authReady) return null;
    return currentUser ? <Navigate to={homeForRole[currentUser.role]} replace /> : <Auth />;
  }

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isLanding || isAuth) {
    return location.pathname === '/' ? <Landing /> : <Auth />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><Dashboard /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute roles={['student']}><StudyMaterials /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute roles={['student']}><QuizArena /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute roles={['student']}><TutorChat /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute roles={['student']}><Progress /></ProtectedRoute>} />
          <Route path="/teacher-dashboard" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * Main App Component
 * Wraps the entire application with necessary context providers (AppProvider)
 * and the routing configuration (Router).
 */
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
