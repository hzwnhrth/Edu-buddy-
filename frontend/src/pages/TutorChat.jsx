import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { chatWithTutor } from '../services/api';
import { HiOutlinePaperAirplane, HiOutlineTrash, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlinePaperClip, HiOutlineXMark } from 'react-icons/hi2';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downscale(dataUrl, maxDim, mimeType, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function fileToImagePayload(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP or GIF images are supported.');
  }
  const dataUrl = await readAsDataUrl(file);
  if (file.type === 'image/gif') {
    return { base64: dataUrl.split(',')[1], mimeType: 'image/gif', thumb: dataUrl };
  }
  const [full, thumb] = await Promise.all([
    downscale(dataUrl, 1024, 'image/jpeg', 0.85),
    downscale(dataUrl, 240, 'image/jpeg', 0.6),
  ]);
  return { base64: full.split(',')[1], mimeType: 'image/jpeg', thumb };
}

/**
 * TutorChat Component
 * Provides a chat interface for the student to converse with the AI Tutor.
 * It manages the local message history, handles sending messages to the backend API,
 * and displays loading states while waiting for the AI response.
 */
export default function TutorChat() {
  const { activeMaterialId, activeMaterialTitle, chatHistory, addChatMessage, clearChatHistory } = useAppContext();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'Explain the main concepts from my notes',
    'Give me a summary of what I studied',
    'What should I focus on for an exam?',
  ]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [pendingImage, setPendingImage] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const attachFile = async (file) => {
    if (!file) return;
    try {
      const payload = await fileToImagePayload(file);
      setPendingImage(payload);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePaste = (e) => {
    const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      attachFile(file);
    }
  };

  const handleSend = async (message = null) => {
    const msg = message || input.trim();
    if ((!msg && !pendingImage) || loading) return;

    const question = msg || 'What is in this image?';
    const image = pendingImage;

    const userMessage = {
      role: 'user',
      content: question,
      ...(image?.thumb ? { image: image.thumb } : {}),
    };
    addChatMessage(userMessage);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    try {
      const response = await chatWithTutor(
        question,
        activeMaterialId || undefined,
        chatHistory.slice(-10),
        image ? { base64: image.base64, mimeType: image.mimeType } : null
      );
      const assistantMessage = { role: 'assistant', content: response.reply };
      addChatMessage(assistantMessage);
      if (response.suggestions?.length) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        content: `Sorry, I ran into an error: ${err.message}. Please check that the backend is running.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div 
      className="page-container" 
      style={{ height: 'calc(100vh - var(--navbar-height))', display: 'flex', flexDirection: 'column', paddingBottom: '1.5rem' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: '1.75rem' }}>Chat</h1>
          <p>Ask anything about your study material</p>
        </div>
        {chatHistory.length > 0 && (
          <button className="btn btn-secondary" onClick={clearChatHistory} style={{ borderRadius: '9999px', fontSize: '0.85rem' }}>
            <HiOutlineTrash /> Clear
          </button>
        )}
      </div>

      {activeMaterialId && (
        <motion.div 
          initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{
            padding: '0.6rem 1rem', borderRadius: '9999px',
            background: '#DCFCE7', border: '1px solid rgba(34,197,94,0.2)',
            fontSize: '0.8rem', color: '#16A34A', marginBottom: '0.75rem', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start'
          }}
        >
          <HiOutlineChatBubbleLeftRight /> Study context: {activeMaterialTitle || 'your notes'}
        </motion.div>
      )}

      {/* Messages */}
      <div className="chat-messages card" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
        {chatHistory.length === 0 && !loading && (
          <motion.div 
            className="empty-state" 
            style={{ margin: 'auto', textAlign: 'center' }}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          >
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', color: '#FFFFFF', margin: '0 auto 1.25rem auto', boxShadow: '0 4px 16px rgba(34,197,94,0.25)' }}>
              <HiOutlineAcademicCap />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.4rem', color: '#111827' }}>How can I help you study?</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Ask me anything about your study material.</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {chatHistory.map((msg, i) => (
            <motion.div 
              key={i} 
              className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{ display: 'flex', gap: '0.75rem', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
            >
              {msg.role === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, boxShadow: '0 2px 6px rgba(34,197,94,0.2)' }}>
                  <HiOutlineAcademicCap />
                </div>
              )}
              <div className="chat-bubble">
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="attachment"
                    style={{ maxWidth: '220px', borderRadius: '10px', display: 'block', marginBottom: msg.content ? '0.5rem' : 0 }}
                  />
                )}
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div 
              className="chat-message assistant"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                <HiOutlineAcademicCap />
              </div>
              <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1rem' }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {chatHistory.length < 2 && (
        <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', marginTop: '0.5rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '9999px' }} 
              onClick={() => handleSend(s)}
            >
              <HiOutlineChatBubbleLeftRight style={{ color: '#22C55E', fontSize: '0.85rem' }} /> {s}
            </button>
          ))}
        </motion.div>
      )}

      {/* Pending image preview */}
      <AnimatePresence>
        {pendingImage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={pendingImage.thumb}
                alt="attachment preview"
                style={{ height: '56px', borderRadius: '10px', border: '2px solid #E5E7EB', display: 'block' }}
              />
              <button
                onClick={() => setPendingImage(null)}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
                  borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#EF4444',
                  color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                }}
                title="Remove image"
              >
                <HiOutlineXMark />
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>Image attached - will be sent with your next message</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <motion.div className="chat-input-container" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => {
            attachFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          className="btn btn-secondary"
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Attach an image (or paste it with Ctrl+V)"
        >
          <HiOutlinePaperClip style={{ fontSize: '1.15rem' }} />
        </button>
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask a question... (paste images with Ctrl+V)"
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, flexShrink: 0 }}
          onClick={() => handleSend()}
          disabled={(!input.trim() && !pendingImage) || loading}
        >
          <HiOutlinePaperAirplane style={{ fontSize: '1.25rem', transform: 'rotate(-45deg)', marginLeft: '3px', marginBottom: '3px' }} />
        </button>
      </motion.div>
    </motion.div>
  );
}
