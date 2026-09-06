const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const SERVICE_ACCOUNT = "C:\\Users\\Guess\\Documents\\Projects\\Personal\\Hackathon\\json\\edubuddy-yolo-firebase-adminsdk-fbsvc-aefbedf803.json";
const SCRATCH = "C:\\Users\\Guess\\Documents\\Projects\\Personal\\Hackathon\\scratch";
const EMAIL = "admin@student.local";
const DISPLAY_NAME = "Test Admin";
const PASSWORD_LENGTH = 14;

function generatePassword(len) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits;
  const chars = [
    lower[crypto.randomInt(lower.length)],
    upper[crypto.randomInt(upper.length)],
    digits[crypto.randomInt(digits.length)],
  ];
  for (let i = chars.length; i < len; i++) {
    chars.push(all[crypto.randomInt(all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function main() {
  const app = initializeApp({ credential: cert(SERVICE_ACCOUNT) });
  const auth = getAuth(app);

  const password = generatePassword(PASSWORD_LENGTH);
  let uid;
  let mode;

  try {
    const user = await auth.createUser({
      email: EMAIL,
      password,
      displayName: DISPLAY_NAME,
      emailVerified: true,
    });
    uid = user.uid;
    mode = "created";
  } catch (err) {
    if (err && err.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(EMAIL);
      const user = await auth.updateUser(existing.uid, {
        password,
        displayName: DISPLAY_NAME,
      });
      uid = user.uid;
      mode = "updated";
    } else {
      throw err;
    }
  }

  await auth.setCustomUserClaims(uid, { role: "admin" });

  const fresh = await auth.getUser(uid);
  const claimOk = Boolean(fresh.customClaims) && fresh.customClaims.role === "admin";
  if (!claimOk) {
    throw new Error("claim verification failed: customClaims.role is not admin");
  }

  fs.mkdirSync(SCRATCH, { recursive: true });
  fs.writeFileSync(
    path.join(SCRATCH, "test-admin.txt"),
    `email: ${EMAIL}\npassword: ${password}\nuid: ${uid}\n`,
  );
  fs.writeFileSync(
    path.join(SCRATCH, "test-admin-notes.md"),
    `# Test admin account notes\n\n` +
      `- Project: edubuddy-yolo\n` +
      `- Mode: ${mode} the user via the Firebase Admin SDK, using the service account file from the json folder (contents never read or copied).\n` +
      `- Email: ${EMAIL}\n` +
      `- UID: ${uid}\n` +
      `- Password: generated with crypto.randomInt, 14 characters, mixed case plus digits, then written to test-admin.txt.\n` +
      `- If the email already existed, the password and displayName were updated on the existing user instead of failing.\n` +
      `- Set custom claim via setCustomUserClaims(uid, { role: "admin" }), then re-fetched the user with getUser and confirmed customClaims.role === "admin".\n` +
      `- displayName: ${DISPLAY_NAME}\n` +
      `- Date: ${new Date().toISOString()}\n`,
  );

  console.log(`mode=${mode}`);
  console.log(`uid=${uid}`);
  console.log(`claimVerified=${claimOk}`);
  console.log(`password=${password}`);

  await app.delete();
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
