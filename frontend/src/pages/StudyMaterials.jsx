import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { HiOutlineBookOpen, HiOutlineDocumentText, HiOutlineCheckBadge, HiOutlineArrowLeft, HiOutlineLightBulb } from 'react-icons/hi2';

/**
 * StudyMaterials Component (Student)
 * A read-only library of study materials approved by the teacher.
 * Students cannot generate their own notes — they only see what has been
 * reviewed and published. Opening a material loads it as active study content.
 */
export default function StudyMaterials() {
  const { approvedNotes, setActiveMaterial } = useAppContext();
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [flippedCards, setFlippedCards] = useState({});

  const openMaterial = (material) => {
    setSelected(material);
    setActiveTab('notes');
    setFlippedCards({});
    if (material.material?.id) {
      setActiveMaterial(material.material.id, material.material.title);
    }
  };

  const backToLibrary = () => {
    setSelected(null);
    setFlippedCards({});
  };

  const toggleCard = (index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {!selected ? (
        <>
          <div className="page-header">
            <h1>Study Materials</h1>
            <p>Notes reviewed and approved by your teacher. Learn with confidence.</p>
          </div>

          {approvedNotes.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#9CA3AF' }}>
                  <HiOutlineBookOpen />
                </div>
                <h3>No materials yet</h3>
                <p>Your teacher hasn't published any study materials yet. Check back soon!</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {approvedNotes.map((m) => (
                <motion.div
                  key={m.approvedAt}
                  className="card"
                  style={{ cursor: 'pointer', padding: '1.5rem' }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => openMaterial(m)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', color: '#3B82F6' }}>
                      <HiOutlineDocumentText />
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', background: '#DCFCE7', color: '#16A34A', fontSize: '0.7rem', fontWeight: 800 }}>
                      <HiOutlineCheckBadge /> Teacher Approved
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: '0.4rem' }}>
                    {m.notes?.title || m.material?.title || 'Untitled Notes'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {m.notes?.summary ? m.notes.summary.slice(0, 100) + (m.notes.summary.length > 100 ? '...' : '') : 'No summary available.'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>
                    <span>{m.material?.topics?.length || 0} topics</span>
                    <span>{m.flashcards?.length || 0} flashcards</span>
                    <span>{m.approvedAt ? new Date(m.approvedAt).toLocaleDateString() : ''}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>{selected.notes?.title || selected.material?.title || 'Study Material'}</h1>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HiOutlineCheckBadge style={{ color: '#16A34A' }} /> Approved by your teacher
                {selected.approvedAt ? ` on ${new Date(selected.approvedAt).toLocaleDateString()}` : ''}
              </p>
            </div>
            <button className="btn btn-secondary" onClick={backToLibrary} style={{ borderRadius: '9999px' }}>
              <HiOutlineArrowLeft /> All Materials
            </button>
          </div>

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
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', color: '#3B82F6' }}>{selected.notes.title}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {selected.notes.sections?.map((sec, i) => (
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
                  {selected.flashcards?.map((card, i) => (
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
                    <p style={{ color: '#6B7280', lineHeight: 1.7 }}>{selected.notes.summary}</p>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#8B5CF6' }}>Key Terms</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '1.25rem', color: '#6B7280' }}>
                    {selected.notes.keyPoints?.map((kp, i) => (
                      <li key={i} style={{ lineHeight: 1.6 }}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to test yourself?</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1rem' }}>This material is loaded — jump into Quiz Arena to practice it.</p>
            <Link to="/quiz" className="btn btn-primary" style={{ borderRadius: '9999px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiOutlineLightBulb /> Go to Quiz Arena
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
