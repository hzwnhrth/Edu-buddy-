const API_BASE = '/api';

/**
 * getProfileId
 * The backend identifies every browser by an anonymous profile id, read from
 * localStorage and created on first use. It is sent as the x-profile-id
 * header on every request (this is EduBuddy's only notion of identity).
 */
export function getProfileId() {
  let id = localStorage.getItem('edubuddy.profileId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('edubuddy.profileId', id);
  }
  return id;
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  // Opportunistic display-name sync: the backend stores the signed-in
  // user's name on any request, so the teacher's classroom view shows
  // real names without a separate update call.
  let displayName = null;
  try {
    const saved = JSON.parse(localStorage.getItem('edubuddy_data') || '{}');
    displayName = saved.currentUser?.name || null;
  } catch { /* ignore */ }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-profile-id': getProfileId(),
      ...(displayName ? { 'x-display-name': displayName } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText || 'Request failed');
  }
  return data;
}

/**
 * analyzeText
 * Turns pasted text into a stored material (server keeps the text as chunks).
 */
export function analyzeText(title, text) {
  return apiFetch('/analyze', { method: 'POST', body: { title, text } });
}

/**
 * generateNotes
 * Two-step teacher flow: upload/paste -> /analyze-pdf or /analyze creates a
 * material, then /api/notes generates the study notes (sections, summary,
 * key points) and flashcards for that material.
 * Returns { material, notes, flashcards }.
 */
export async function generateNotes(file, text) {
  let material;

  if (file) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const data = await apiFetch('/analyze-pdf', {
      method: 'POST',
      body: {
        title: file.name,
        pdfBase64: base64,
        sourceName: file.name,
      },
    });
    material = data.material;
  } else if (text) {
    const data = await apiFetch('/analyze', {
      method: 'POST',
      body: { title: 'Pasted Text', text },
    });
    material = data.material;
  } else {
    throw new Error('Must provide either file or text');
  }

  const notesData = await apiFetch('/notes', {
    method: 'POST',
    body: { materialId: material.id },
  });

  return {
    material,
    notes: notesData.notes,
    flashcards: notesData.flashcards || [],
  };
}

/**
 * generateQuiz
 * Builds a quiz for a stored material. Answers with { quiz } where quiz
 * carries questions with qid, stem, options, correctAnswerIndex, explanation.
 */
export function generateQuiz(materialId, difficulty = 'medium', count = 5) {
  return apiFetch('/quiz', {
    method: 'POST',
    body: { materialId, difficulty, count },
  });
}

/**
 * gradeQuiz
 * Submits the finished answers for authoritative server-side grading.
 * answers: [{ qid, chosenIndex }]. Answers with { attempt, results, topicResults }.
 */
export function gradeQuiz(quizId, answers) {
  return apiFetch('/attempt', { method: 'POST', body: { quizId, answers } });
}

/**
 * chatWithTutor
 * One AI tutor reply. materialId (optional) gives the tutor the material's
 * text as context; history is the caller's last 10 messages; image
 * (optional, { base64, mimeType }) attaches one picture to the message.
 */
export function chatWithTutor(message, materialId = undefined, history = [], image = null) {
  return apiFetch('/chat', {
    method: 'POST',
    body: {
      message,
      materialId,
      history,
      ...(image ? { imageBase64: image.base64, imageMimeType: image.mimeType } : {}),
    },
  });
}

/**
 * getAdminOverview
 * School-wide analytics for the Admin Dashboard: real stats and alerts
 * aggregated across every profile in the database.
 */
export function getAdminOverview() {
  return apiFetch('/admin/overview');
}

/**
 * getTeacherClassroom
 * The class roster for the Teacher Dashboard's Classroom View: per-student
 * mastery, status color, weak topics and the weakness table rows.
 */
export function getTeacherClassroom() {
  return apiFetch('/teacher/classroom');
}

/**
 * getStatus
 * Health check: which AI and store backends are live.
 */
export function getStatus() {
  return apiFetch('/status');
}
