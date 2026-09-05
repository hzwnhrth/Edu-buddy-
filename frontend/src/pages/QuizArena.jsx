import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { generateQuiz, gradeQuiz } from '../services/api';
import { HiOutlineLightBulb, HiOutlineArrowRight, HiOutlineArrowPath, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCheck } from 'react-icons/hi2';

export default function QuizArena() {
  const { studyContent, addQuizResult } = useAppContext();
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');

  const contentToUse = studyContent || textInput;

  const handleStart = async () => {
    if (!contentToUse.trim()) {
      setError('Please upload notes first (from the Notes Generator page) or paste content below.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await generateQuiz(contentToUse, difficulty, numQuestions);
      setQuiz(data);
      setCurrentQ(0);
      setAnswers([]);
      setSelectedOption(null);
      setResults(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (index) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleNext = async () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);

    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setLoading(true);
      try {
        const gradeResult = await gradeQuiz(quiz.questions, newAnswers);
        setResults(gradeResult);
        addQuizResult(gradeResult);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

  const resetQuiz = () => {
    setQuiz(null);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResults(null);
    setShowExplanation(false);
  };

  const difficultyConfig = {
    easy: { label: 'Easy', color: '#22C55E', bg: '#DCFCE7' },
    medium: { label: 'Medium', color: '#F59E0B', bg: '#FEF3C7' },
    hard: { label: 'Hard', color: '#EF4444', bg: '#FEE2E2' },
  };

  // Start Screen
  if (!quiz && !loading && !results) {
    return (
      <motion.div className="page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1>Quiz Arena</h1>
          <p>Test your knowledge with AI-generated quizzes. Choose your difficulty!</p>
        </div>

        <div style={{ maxWidth: '550px', margin: '0 auto' }}>
          {!studyContent && (
            <motion.div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }} initial={{ y: 16 }} animate={{ y: 0 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.6rem', color: '#111827' }}>Paste your study content</h3>
              <textarea
                className="input-glass"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your study material here to generate a quiz..."
                style={{ minHeight: '110px' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.6rem' }}>
                Tip: Generate notes first from the Notes Generator page — they'll be automatically used here.
              </p>
            </motion.div>
          )}

          {studyContent && (
            <motion.div className="card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem', border: '1px solid rgba(34,197,94,0.3)', background: '#DCFCE7' }} initial={{ y: 16 }} animate={{ y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#16A34A', fontSize: '0.85rem', fontWeight: 700 }}>
                ✅ Study content loaded from Notes Generator
              </div>
            </motion.div>
          )}

          <motion.div className="card" style={{ padding: '2rem' }} initial={{ y: 16 }} animate={{ y: 0 }} transition={{ delay: 0.1 }}>
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', textAlign: 'center', color: '#111827' }}>Select Difficulty</h3>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                {['easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    style={{
                      flex: 1,
                      padding: '0.65rem 1rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: difficulty === d ? `2px solid ${difficultyConfig[d].color}` : '2px solid #E5E7EB',
                      background: difficulty === d ? difficultyConfig[d].bg : '#FFFFFF',
                      color: difficulty === d ? difficultyConfig[d].color : '#6B7280',
                      fontFamily: 'inherit',
                      transition: '0.2s ease',
                    }}
                    onClick={() => setDifficulty(d)}
                  >
                    {difficultyConfig[d].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
              <label style={{ fontSize: '0.9rem', color: '#6B7280', marginRight: '0.75rem', fontWeight: 600 }}>
                Questions:
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: '9999px',
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  color: '#111827', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {error && (
              <div style={{ color: '#EF4444', textAlign: 'center', margin: '0.75rem 0', fontSize: '0.9rem', fontWeight: 600, background: '#FEE2E2', padding: '0.75rem', borderRadius: '10px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', borderRadius: '9999px', width: '100%' }}
                onClick={handleStart}
                disabled={!contentToUse.trim()}
              >
                <HiOutlineLightBulb /> Start Quiz
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <motion.div className="card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem', color: '#111827' }}>Generating your quiz...</h3>
          <p style={{ color: '#6B7280' }}>Creating {numQuestions} {difficulty} questions</p>
        </motion.div>
      </div>
    );
  }

  // Results
  if (results) {
    const getResultText = (pct) => {
      if (pct >= 90) return 'Excellent!';
      if (pct >= 70) return 'Great job!';
      if (pct >= 50) return 'Good effort!';
      return 'Keep practicing!';
    };

    return (
      <motion.div className="page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem' }}>
            <motion.div 
              className="score-circle"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
              <div className="score-value">{results.percentage}%</div>
              <div className="score-label">{results.score}/{results.total}</div>
            </motion.div>
            
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>
              {getResultText(results.percentage)}
            </h2>
            <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>{results.feedback}</p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={resetQuiz} style={{ borderRadius: '9999px' }}>
                <HiOutlineArrowPath /> Try Again
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#6B7280' }}>Detailed Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {results.results.map((r, i) => (
              <motion.div key={i} className="card" style={{ padding: '1.25rem' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.35rem', marginTop: '-0.15rem', color: r.is_correct ? '#22C55E' : '#EF4444' }}>
                    {r.is_correct ? <HiOutlineCheckCircle /> : <HiOutlineXCircle />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem', color: '#111827' }}>{r.question}</p>
                    {!r.is_correct && (
                      <div style={{ padding: '0.6rem 0.85rem', background: '#FEE2E2', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '0.4rem', color: '#6B7280', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#EF4444' }}>Your answer:</strong> {r.selected_option}
                      </div>
                    )}
                    <div style={{ padding: '0.6rem 0.85rem', background: '#DCFCE7', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', marginBottom: '0.75rem', color: '#6B7280', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#16A34A' }}>Correct:</strong> {r.correct_option}
                    </div>
                    {r.explanation && (
                      <div style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.6 }}>
                        {r.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Quiz in progress
  const question = quiz.questions[currentQ];
  const progress = ((currentQ + 1) / quiz.questions.length) * 100;

  return (
    <div className="page-container">
      <div style={{ maxWidth: '750px', margin: '0 auto' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ flex: 1, height: '8px', background: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden' }}>
            <motion.div 
              style={{ height: '100%', background: 'linear-gradient(90deg, #22C55E, #3B82F6)', borderRadius: '9999px' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div style={{ fontWeight: 700, color: '#6B7280', fontSize: '0.9rem' }}>
            {currentQ + 1}/{quiz.questions.length}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQ}
            className="card"
            style={{ padding: '2.5rem' }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.75rem', lineHeight: 1.5, color: '#111827' }}>
              {question.question}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {question.options.map((option, i) => {
                let className = 'quiz-option';
                let style = {};
                
                if (showExplanation) {
                  if (i === question.correct_answer) {
                    className += ' correct';
                  } else if (i === selectedOption) {
                    className += ' incorrect';
                  }
                } else if (i === selectedOption) {
                  className += ' selected';
                }

                return (
                  <motion.button 
                    whileHover={!showExplanation ? { scale: 1.01 } : {}}
                    whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    key={i} 
                    className={className} 
                    style={style}
                    onClick={() => handleSelectOption(i)}
                  >
                    <span className="quiz-option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ textAlign: 'left', fontWeight: selectedOption === i ? 700 : 500 }}>{option}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {showExplanation && question.explanation && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: '1.5rem', padding: '1rem', background: '#F0FDF4', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#16A34A', fontWeight: 700, marginRight: '0.4rem' }}>Explanation:</span> 
                    {question.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
              {!showExplanation ? (
                <button
                  className="btn btn-secondary"
                  onClick={handleCheckAnswer}
                  disabled={selectedOption === null}
                  style={{ borderRadius: '9999px' }}
                >
                  Check Answer
                </button>
              ) : null}
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={selectedOption === null}
                style={{ borderRadius: '9999px' }}
              >
                {currentQ < quiz.questions.length - 1 ? (
                  <><HiOutlineArrowRight /> Next</>
                ) : (
                  <><HiOutlineCheck /> Finish Quiz</>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
