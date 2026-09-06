import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';

const AppContext = createContext();
const STORAGE_PREFIX = 'edubuddy_data';

const defaultState = {
  currentUser: null,
  studyContent: null,
  activeMaterialId: null,
  activeMaterialTitle: null,
  notesHistory: [],
  approvedNotes: [],
  quizHistory: [],
  chatHistory: [],
  stats: {
    notesGenerated: 0,
    quizzesTaken: 0,
    questionsAsked: 0,
    studyStreak: 0,
    averageScore: 0,
    totalStudyTime: 0,
    lastStudyDate: null,
  },
};

function storageKey(uid) {
  return `${STORAGE_PREFIX}.${uid}`;
}

function loadState(uid) {
  try {
    const saved = localStorage.getItem(storageKey(uid));
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function roleFromClaims(claims) {
  return claims.role === 'teacher' || claims.role === 'admin' ? claims.role : 'student';
}

async function toCurrentUser(user) {
  const token = await user.getIdTokenResult();
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Student',
    email: user.email,
    role: roleFromClaims(token.claims),
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setState(defaultState);
        setAuthReady(true);
        return;
      }

      const currentUser = await toCurrentUser(user);
      setState({ ...loadState(user.uid), currentUser });
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;
    const { currentUser, ...persisted } = state;
    try {
      localStorage.setItem(storageKey(currentUser.uid), JSON.stringify(persisted));
    } catch (error) {
      console.warn('Could not persist study state:', error);
    }
  }, [state]);

  const signup = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(credential.user, { displayName: name });
    const currentUser = await toCurrentUser(credential.user);
    setState({ ...loadState(credential.user.uid), currentUser });
    return currentUser;
  };

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const currentUser = await toCurrentUser(credential.user);
    setState({ ...loadState(credential.user.uid), currentUser });
    return currentUser;
  };

  const logout = () => signOut(getFirebaseAuth());

  const setStudyContent = (content) => setState((prev) => ({ ...prev, studyContent: content }));
  const setActiveMaterial = (id, title = null) => setState((prev) => ({ ...prev, activeMaterialId: id, activeMaterialTitle: title }));
  const addNotesResult = (notes) => setState((prev) => ({
    ...prev,
    notesHistory: [{ ...notes, timestamp: Date.now() }, ...prev.notesHistory].slice(0, 20),
    stats: { ...prev.stats, notesGenerated: prev.stats.notesGenerated + 1 },
  }));
  const approveNote = (note) => setState((prev) => ({
    ...prev,
    approvedNotes: [{ ...note, approvedAt: Date.now() }, ...prev.approvedNotes],
  }));
  const removeApprovedNote = (approvedAt) => setState((prev) => ({
    ...prev,
    approvedNotes: prev.approvedNotes.filter((note) => note.approvedAt !== approvedAt),
  }));
  const addQuizResult = (result) => setState((prev) => {
    const quizHistory = [{ ...result, timestamp: Date.now() }, ...prev.quizHistory].slice(0, 50);
    const averageScore = Math.round(quizHistory.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0) / quizHistory.length);
    return {
      ...prev,
      quizHistory,
      stats: { ...prev.stats, quizzesTaken: prev.stats.quizzesTaken + 1, averageScore, lastStudyDate: new Date().toISOString().split('T')[0] },
    };
  });
  const addChatMessage = (message) => setState((prev) => ({
    ...prev,
    chatHistory: [...prev.chatHistory, message].slice(-50),
    stats: { ...prev.stats, questionsAsked: message.role === 'user' ? prev.stats.questionsAsked + 1 : prev.stats.questionsAsked },
  }));
  const clearChatHistory = () => setState((prev) => ({ ...prev, chatHistory: [] }));

  const refreshUserRole = async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    await user.getIdToken(true);
    const result = await user.getIdTokenResult();
    const role = roleFromClaims(result.claims);
    const currentUser = { ...state.currentUser, role };
    setState((prev) => ({ ...prev, currentUser }));
    return currentUser;
  };

  return (
    <AppContext.Provider value={{ ...state, authReady, signup, login, logout, setStudyContent, setActiveMaterial, addNotesResult, approveNote, removeApprovedNote, addQuizResult, addChatMessage, clearChatHistory, refreshUserRole }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
