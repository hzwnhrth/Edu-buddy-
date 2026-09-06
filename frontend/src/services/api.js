const API_BASE = '/api';

/**
 * getProfileId
 * The backend identifies a user by their verified Firebase ID token.
 */
import { getFirebaseAuth } from '../lib/firebase';

async function apiFetch(path, { method = 'GET', body } = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Sign in is required');
  }
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
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
 * setRole
 * Assigns the signed-in profile a role (student, teacher, admin). Teachers and
 * admins also send the access code the server checks against.
 */
export function setRole(role, code) { return apiFetch('/role', { method: 'POST', body: { role, ...(code ? { code } : {}) } }); }

/**
 * getStatus
 * Health check: which AI and store backends are live.
 */
export function getStatus() {
  return apiFetch('/status');
}
