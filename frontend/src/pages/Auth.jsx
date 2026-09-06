import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { setRole } from '../services/api';
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineArrowRight } from 'react-icons/hi2';

const homeForRole = { student: '/dashboard', teacher: '/teacher-dashboard', admin: '/admin-dashboard' };
const ROLE_HINT_KEY = 'edubuddy.roleHint';
const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

function readRoleHint() {
  const saved = localStorage.getItem(ROLE_HINT_KEY);
  return roleOptions.some((option) => option.value === saved) ? saved : 'student';
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  const meta = [
    { label: 'Weak', color: '#EF4444' },
    { label: 'Okay', color: '#F59E0B' },
    { label: 'Good', color: '#22C55E' },
    { label: 'Strong', color: '#16A34A' },
  ];
  return { score, ...meta[score] };
}

/**
 * Auth Component
 * Combined Login / Signup screen. Follows the app's Neo-Minimalist theme:
 * centered card, dotted backdrop, and Firebase email/password authentication.
 */
export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignup = location.pathname === '/signup';
  const { login, signup, refreshUserRole } = useAppContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(readRoleHint);
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const needsCode = selectedRole === 'teacher' || selectedRole === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup && name.trim().length < 2) return setError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      if (isSignup) {
        await signup({ name: name.trim(), email: email.trim().toLowerCase(), password });
      } else {
        const signedIn = await login(email.trim().toLowerCase(), password);
        if (!signedIn) {
          setError('Wrong email or password. Try again, or create a new account.');
          return;
        }
      }

      try {
        await setRole(selectedRole, needsCode ? accessCode : '');
      } catch (cause) {
        setError(cause.message || 'Could not save your role. Please try again.');
        return;
      }

      const user = await refreshUserRole();
      localStorage.setItem(ROLE_HINT_KEY, selectedRole);
      navigate(homeForRole[user?.role] || '/dashboard', { replace: true });
    } catch (cause) {
      setError(cause.message || 'Unable to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
    borderRadius: '14px', border: '1px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.95rem', fontFamily: 'inherit', color: '#111827', outline: 'none',
    transition: 'border 0.2s, box-shadow 0.2s',
  };

  const iconStyle = { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '1.05rem' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFBFC', padding: '1.5rem', position: 'relative' }}>
      {/* Dotted backdrop (matches Landing) */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.5 }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px',
          background: '#FFFFFF', borderRadius: '28px', padding: '2.75rem 2.5rem',
          boxShadow: '0 24px 48px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.03)',
        }}
      >
        {/* Logo + heading */}
        <motion.img
          src="/edubuddy_full_logo.svg" alt="EduBuddy"
          style={{ display: 'block', margin: '0 auto 1.5rem auto', maxWidth: '150px', width: '100%', height: 'auto' }}
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', color: '#111827', marginBottom: '0.35rem' }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          {isSignup ? 'Join your classroom in one minute' : 'Log in to continue your study journey'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {isSignup && (
            <div style={{ position: 'relative' }}>
              <HiOutlineUser style={iconStyle} />
              <input style={inputStyle} type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <HiOutlineEnvelope style={iconStyle} />
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          </div>

          {/* Role picker */}
          <div
            role="group"
            aria-label="Choose your role"
            style={{ display: 'flex', gap: '0.35rem', padding: '0.3rem', borderRadius: '14px', border: '1px solid #E5E7EB', background: '#F9FAFB' }}
          >
            {roleOptions.map((option) => {
              const active = selectedRole === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRole(option.value)}
                  aria-pressed={active}
                  style={{
                    flex: 1, padding: '0.6rem 0.4rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 800, fontFamily: 'inherit',
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                    background: active ? '#22C55E' : 'transparent',
                    color: active ? '#FFFFFF' : '#6B7280',
                    boxShadow: active ? '0 2px 8px rgba(34, 197, 94, 0.25)' : 'none',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative' }}>
            <HiOutlineLockClosed style={iconStyle} />
            <input
              style={{ ...inputStyle, paddingRight: '2.75rem' }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            <button
              type="button" onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '0.2rem', display: 'flex' }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <HiOutlineEyeSlash style={{ fontSize: '1.05rem' }} /> : <HiOutlineEye style={{ fontSize: '1.05rem' }} />}
            </button>
          </div>

          {/* Access code (teachers and admins only) */}
          {needsCode && (
            <div style={{ position: 'relative' }}>
              <HiOutlineLockClosed style={iconStyle} />
              <input
                style={inputStyle}
                type="password"
                placeholder="Access code"
                aria-label="Access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          {/* Password strength (signup only) */}
          {isSignup && password.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ flex: 1, display: 'flex', gap: '0.3rem' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: '4px', borderRadius: 2, background: i < strength.score ? strength.color : '#E5E7EB', transition: 'background 0.2s' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: strength.color, minWidth: '44px', textAlign: 'right' }}>{strength.label}</span>
            </div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#DC2626', background: '#FEE2E2', padding: '0.7rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: '14px', marginTop: '0.35rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Log In')} <HiOutlineArrowRight />
          </motion.button>
        </form>

        {/* Switch mode */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: '#6B7280' }}>
          {isSignup ? 'Already have an account? ' : 'New to EduBuddy? '}
          <Link to={isSignup ? '/login' : '/signup'} style={{ color: '#16A34A', fontWeight: 800, textDecoration: 'none' }}>
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
