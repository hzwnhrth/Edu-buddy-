"use client";

// The one material the student is currently working on, shared by the Notes
// Generator (which sets it), the Quiz Arena and the AI Tutor (which read it).
// It survives reloads in localStorage, exactly like the profile id, and never
// travels to the server on its own: every API call names the material it
// wants explicitly.

const STORAGE_KEY = "edubuddy.activeMaterialId";

export function getActiveMaterialId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveMaterialId(materialId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, materialId);
  } catch {
    // Storage being unavailable (private mode, blocked) just means the
    // Quiz Arena and AI Tutor start without context; not worth failing on.
  }
}

export function clearActiveMaterialId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above: nothing to do.
  }
}
