import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const STORAGE_KEY = 'edubuddy_data';

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

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
