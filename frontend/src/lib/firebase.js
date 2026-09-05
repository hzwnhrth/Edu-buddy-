import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function getFirebaseAuth() {
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error('Firebase Authentication is not configured. Add the VITE_FIREBASE_* values to frontend/.env.local.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
