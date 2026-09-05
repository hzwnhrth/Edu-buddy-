const API_BASE = 'http://localhost:8000/api';

export async function generateNotes(file, text, style = 'detailed') {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (text) {
    formData.append('text', text);
  }
  formData.append('style', style);

  const res = await fetch(`${API_BASE}/notes/generate`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to generate notes');
  }
  return res.json();
}

export async function generateQuiz(text, difficulty = 'medium', numQuestions = 5) {
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      difficulty,
      num_questions: numQuestions,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to generate quiz');
  }
  return res.json();
}

export async function gradeQuiz(questions, answers) {
  const res = await fetch(`${API_BASE}/quiz/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions, answers }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to grade quiz');
  }
  return res.json();
}

export async function chatWithTutor(message, context = null, history = []) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Chat failed');
  }
  return res.json();
}
