import { createContext, useContext, useState, useEffect } from 'react';

/**
 * AppContext
 * Creates a global state context so that data (like study content, history, stats)
 * can be shared across all pages without having to pass props down manually.
 */
const AppContext = createContext();

const STORAGE_KEY = 'edubuddy_data';

/**
 * Default Initial State
 * The starting data structure for a new user before they generate anything.
 */
const defaultState = {
  studyContent: null,       // Currently uploaded/active content text
  notesHistory: [],          // Past generated notes
  quizHistory: [],           // Past quiz results
  chatHistory: [],           // Chat messages
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

/**
 * loadState()
 * Attempts to load the user's saved data from the browser's localStorage.
 * If none exists or it fails, it returns the defaultState.
 */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return defaultState;
}

/**
 * AppProvider Component
 * This wrapper component manages the state and provides the context to its children.
 * It contains helper functions to update the state (like adding a quiz result).
 */
export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setStudyContent = (content) => {
    setState(prev => ({ ...prev, studyContent: content }));
  };

  const addNotesResult = (notes) => {
    setState(prev => ({
      ...prev,
      notesHistory: [{ ...notes, timestamp: Date.now() }, ...prev.notesHistory].slice(0, 20),
      stats: { ...prev.stats, notesGenerated: prev.stats.notesGenerated + 1 },
    }));
  };

  const addQuizResult = (result) => {
    const newHistory = [{ ...result, timestamp: Date.now() }, ...state.quizHistory].slice(0, 50);
    const totalScores = newHistory.reduce((sum, q) => sum + (q.percentage || 0), 0);
    const avgScore = Math.round(totalScores / newHistory.length);

    setState(prev => ({
      ...prev,
      quizHistory: newHistory,
      stats: {
        ...prev.stats,
        quizzesTaken: prev.stats.quizzesTaken + 1,
        averageScore: avgScore,
        lastStudyDate: new Date().toISOString().split('T')[0],
      },
    }));
  };

  const addChatMessage = (message) => {
    setState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, message],
      stats: {
        ...prev.stats,
        questionsAsked: message.role === 'user'
          ? prev.stats.questionsAsked + 1
          : prev.stats.questionsAsked,
      },
    }));
  };

  const clearChatHistory = () => {
    setState(prev => ({ ...prev, chatHistory: [] }));
  };

  const value = {
    ...state,
    setStudyContent,
    addNotesResult,
    addQuizResult,
    addChatMessage,
    clearChatHistory,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useAppContext Hook
 * A custom React hook that allows any component to easily access the global state
 * and the helper functions provided by AppProvider.
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
