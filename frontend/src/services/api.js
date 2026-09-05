const API_BASE = 'http://localhost:3000/api'; // Changed to Next.js default port

/**
 * generateNotes
 * Sends a PDF file or text string to the backend to generate study topics/notes.
 * Converts the PDF to base64 before sending.
 */
export async function generateNotes(file, text, style = 'detailed') {
  // If a file (PDF) is provided, we need to convert it to base64 and call analyze-pdf
  if (file) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Strip the data URL prefix (e.g., "data:application/pdf;base64,")
        const b64 = reader.result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = error => reject(error);
    });

    const res = await fetch(`${API_BASE}/analyze-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: file.name,
        pdfBase64: base64,
      }),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze PDF');
    }
    return res.json();
  } 
  
  // If only text is provided, call analyze
  if (text) {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Pasted Text',
        text: text,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to analyze text');
    }
    return res.json();
  }
  
  throw new Error('Must provide either file or text');
}

/**
 * generateQuiz
 * Requests a new quiz from the backend based on a specific material ID.
 * Allows setting difficulty (easy, medium, hard) and the number of questions.
 */
export async function generateQuiz(materialId, difficulty = 'medium', numQuestions = 5) {
  // Updated to match the backend quiz endpoint which expects a materialId
  const res = await fetch(`${API_BASE}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      materialId: materialId,
      difficulty: difficulty,
      count: numQuestions,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to generate quiz');
  }
  return res.json();
}

/**
 * gradeQuiz
 * Submits the student's selected answers for a specific quiz ID to the backend
 * to be graded and saved into the database.
 */
export async function gradeQuiz(quizId, answers) {
  // Updated to match backend attempt endpoint
  const res = await fetch(`${API_BASE}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId, answers }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to grade quiz');
  }
  return res.json();
}

/**
 * chatWithTutor
 * Sends a message to the AI Tutor. (Currently a placeholder for future backend implementation).
 * Allows passing previous chat history and study context for better AI responses.
 */
export async function chatWithTutor(message, context = null, history = []) {
  // This endpoint doesn't exist on the backend yet, but we'll point it to where it should be
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Chat failed');
  }
  return res.json();
}
