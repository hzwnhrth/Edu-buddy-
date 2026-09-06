import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getEnv } from "@/lib/env";

export type UserRole = "student" | "teacher" | "admin";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 503 = 401
  ) {
    super(message);
  }
}

function getAdminAuth() {
  const serviceAccount = getEnv().firebaseServiceAccountJson;
  if (!serviceAccount) {
    throw new AuthError("Authentication is not configured", 503);
  }

  if (getApps().length === 0) {
    const parsed = JSON.parse(serviceAccount) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getAuth();
}

function roleFromToken(token: DecodedIdToken): UserRole {
  return token.role === "teacher" || token.role === "admin" ? token.role : "student";
}

export async function authenticateRequest(authorization: string | null): Promise<AuthenticatedUser> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new AuthError("Sign in is required");
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      role: roleFromToken(decoded),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError("Your session is invalid or has expired");
  }
}

// Writes the role custom claim on the Firebase user. Claims are read back on
// every request by authenticateRequest, so changes take effect on the next
// token the client obtains.
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, { role });
}
