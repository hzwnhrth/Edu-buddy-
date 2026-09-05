import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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
function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login' || location.pathname === '/signup';

  if (isLanding || isAuth) {
    return location.pathname === '/' ? <Landing /> : <Auth />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<StudyMaterials />} />
          <Route path="/quiz" element={<QuizArena />} />
          <Route path="/chat" element={<TutorChat />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
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
