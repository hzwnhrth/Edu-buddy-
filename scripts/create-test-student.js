const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { initializeApp, cert, deleteApp, getApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccountPath = path.resolve(__dirname, "..", "..", "json", "edubuddy-yolo-firebase-adminsdk-fbsvc-aefbedf803.json");
const scratchDir = path.resolve(__dirname, "..", "..", "scratch");

initializeApp({
  credential: cert(serviceAccountPath),
  projectId: "edubuddy-yolo",
});

const EMAIL = "tester@student.local";
const DISPLAY_NAME = "Test Student";

function generatePassword() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";

  const pick = (charset) => {
    const idx = crypto.randomBytes(1)[0] % charset.length;
    return charset[idx];
  };

  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 14) {
    chars.push(pick(alphabet));
  }

  // Fisher-Yates shuffle with randomBytes
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function main() {
  const password = generatePassword();
  const auth = getAuth();
  let uid;
  let action;

  try {
    const user = await auth.createUser({
      email: EMAIL,
      password,
      displayName: DISPLAY_NAME,
    });
    uid = user.uid;
    action = "created";
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(EMAIL);
      await auth.updateUser(existing.uid, {
        password,
        displayName: DISPLAY_NAME,
      });
      uid = existing.uid;
      action = "updated";
    } else {
      throw err;
    }
  }

  // Ensure no custom claims (plain student role)
  const user = await auth.getUser(uid);
  const claims = user.customClaims || {};
  if (Object.keys(claims).length > 0) {
    await auth.setCustomUserClaims(uid, {});
    console.log("Removed existing custom claims:", JSON.stringify(claims));
  }

  const creds = `email: ${EMAIL}\npassword: ${password}\nuid: ${uid}\ndisplayName: ${DISPLAY_NAME}\n`;

  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  fs.writeFileSync(path.join(scratchDir, "test-account.txt"), creds);

  const notes = `# Test Student Account Notes

Date: ${new Date().toISOString()}
Firebase project: edubuddy-yolo
Action: account ${action} via Firebase Admin SDK.

The account has no custom claims set, so the app resolves its role to the
default student role. If the email already existed, the password and display
name were refreshed instead of creating a new user.

Credentials are stored in scratch/test-account.txt.
`;
  fs.writeFileSync(path.join(scratchDir, "test-account-notes.md"), notes);

  console.log(`Action: ${action}`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Password: ${password}`);
  console.log(`UID: ${uid}`);

  const { deleteApp } = require("firebase-admin/app");
  await deleteApp(getApp());
}

main().catch((err) => {
  console.error("Failed:", err.code || err.message);
  process.exit(1);
});
