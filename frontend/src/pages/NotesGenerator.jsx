import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useAppContext } from '../context/AppContext';
import { generateNotes } from '../services/api';
import { HiOutlineDocumentArrowUp, HiOutlineDocumentText, HiOutlineSparkles, HiOutlineArrowPath, HiOutlineClock } from 'react-icons/hi2';

export default function NotesGenerator() {
  const { setStudyContent, addNotesResult, notesHistory } = useAppContext();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [flippedCards, setFlippedCards] = useState({});

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      setStatus('Processing your study materials...');
      const generated = await generateNotes(file, null);
      
      // Store the parsed text from the backend to global context for Quiz/Chat
      if (generated.text) {
        setStudyContent(generated.text);
      }
      
      setResult(generated);
      addNotesResult(generated);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const toggleCard = (index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setFlippedCards({});
    setActiveTab('notes');
  };

  return (
    <motion.div 
      className="page-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Notes Generator</h1>
          <p>Upload a PDF lecture or syllabus and let EduBuddy create your study materials.</p>
        </div>
        {result && (
          <button className="btn btn-secondary" onClick={reset} style={{ borderRadius: '9999px' }}>
            <HiOutlineArrowPath /> New Document
          </button>
        )}
      </div>

      {!result && !loading && (
        <motion.div className="card" initial={{ scale: 0.97 }} animate={{ scale: 1 }}>
          <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'dragging' : ''}`}>
            <input {...getInputProps()} />
            <motion.div 
              animate={{ y: [0, -8, 0] }} 
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <HiOutlineDocumentArrowUp className="upload-zone-icon" />
            </motion.div>
            <h3>{isDragActive ? 'Drop PDF here' : 'Drag & drop a PDF lecture'}</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>or click to browse from your computer</p>
            {file && (
              <div style={{ marginTop: '1.25rem', padding: '0.6rem 1rem', background: '#DCFCE7', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A', fontWeight: 600, fontSize: '0.9rem' }}>
                <HiOutlineDocumentText /> {file.name}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', borderRadius: '9999px' }}
              disabled={!file} 
              onClick={handleGenerate}
            >
              <HiOutlineDocumentText /> Generate Notes
            </button>
          </div>
          
          {notesHistory && notesHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}
            >
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: '#6B7280', fontWeight: 700 }}>
                <HiOutlineClock style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}/>
                Recent Study Materials
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {notesHistory.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    style={{ 
                      padding: '1.25rem', 
                      cursor: 'pointer', 
                      background: '#F9FAFB',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB'
                    }}
                    whileHover={{ scale: 1.02, background: '#F3F4F6' }}
                    onClick={() => {
                      setResult(item);
                      if (item.text) setStudyContent(item.text);
                    }}
                  >
                    <h4 style={{ color: '#3B82F6', marginBottom: '0.4rem', fontSize: '1rem', fontWeight: 700 }}>
                      {item.notes?.title || "Untitled Notes"}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Previous session'} • {item.flashcards?.length || 0} flashcards
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {loading && (
        <motion.div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: '#111827' }}>{status}</h3>
          <p style={{ color: '#6B7280' }}>Analyzing document structure...</p>
        </motion.div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="tabs">
              {['notes', 'flashcards', 'key_points'].map(tab => (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'notes' ? 'Notes' : tab === 'flashcards' ? 'Flashcards' : 'Key Points'}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'notes' && (
                <div className="card">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', color: '#3B82F6' }}>{result.notes.title}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {result.notes.sections?.map((sec, i) => (
                      <div key={i}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>{sec.heading}</h3>
                        <p style={{ color: '#6B7280', lineHeight: 1.7, fontSize: '0.95rem' }}>{sec.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="flashcard-grid">
                  {result.flashcards?.map((card, i) => (
                    <div 
                      key={i} 
                      className={`flashcard ${flippedCards[i] ? 'flipped' : ''}`}
                      onClick={() => toggleCard(i)}
                    >
                      <div className="flashcard-inner">
                        <div className="flashcard-front">
                          <div className="flashcard-label">Question</div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{card.front}</h3>
                        </div>
                        <div className="flashcard-back">
                          <div className="flashcard-label">Answer</div>
                          <p style={{ fontSize: '0.95rem', color: '#16A34A' }}>{card.back}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'key_points' && (
                <div className="card">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', color: '#111827' }}>Summary & Key Concepts</h2>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: '#6B7280', lineHeight: 1.7 }}>{result.notes.summary}</p>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#8B5CF6' }}>Key Terms</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '1.25rem', color: '#6B7280' }}>
                    {result.notes.key_points?.map((kp, i) => (
                      <li key={i} style={{ lineHeight: 1.6 }}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
