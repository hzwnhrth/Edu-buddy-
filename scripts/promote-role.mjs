import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email, role] = process.argv.slice(2);
if (!email || !['teacher', 'admin'].includes(role)) {
  throw new Error('Usage: node scripts/promote-role.mjs <email> <teacher|admin>');
}

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!rawServiceAccount) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be set');
}

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(rawServiceAccount);
  initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { role });
console.log(`Assigned ${role} role to ${email}. The user must sign out and back in to refresh their session.`);
