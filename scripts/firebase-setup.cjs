'use strict';

const fs = require('fs');
const path = require('path');
const { initializeApp, getApp, cert } = require('firebase-admin');

const PROJECT_ID = 'edubuddy-yolo';
const SA_PATH = path.resolve(__dirname, '..', '..', 'json', 'edubuddy-yolo-firebase-adminsdk-fbsvc-aefbedf803.json');
const SCRATCH_DIR = path.resolve(__dirname, '..', '..', 'scratch');
const OUT_JSON = path.join(SCRATCH_DIR, 'firebase-web-config.json');
const OUT_MD = path.join(SCRATCH_DIR, 'firebase-config-notes.md');

const log = [];
function note(line) {
  log.push(line);
  console.log(line);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fail(httpStatus, responseBody, step) {
  note(`FAILED at ${step}: HTTP status ${httpStatus}`);
  note(`Response body: ${responseBody}`);
  note('Stopping. No further calls made. Nothing was guessed.');
  writeNotes();
  process.exit(1);
}

function writeNotes() {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  fs.writeFileSync(OUT_MD, log.join('\n') + '\n', 'utf8');
}

function redactSecrets(text) {
  return String(text).replace(/"(signerKey|saltSeparator)"\s*:\s*"[^"]*"/g, '"$1": "[REDACTED]"');
}

async function main() {
  note('# Firebase setup transcript for project ' + PROJECT_ID);
  note('Date: ' + new Date().toISOString());
  note('Auth: Admin SDK initialized from service account file path only. The file contents and any private key material are never read into logs or written anywhere.');
  note('The OAuth access token is held in memory only and never printed or written.');

  note('');
  note('## Step 1-2: initialize Admin SDK and mint OAuth access token');
  initializeApp({
    credential: cert(SA_PATH),
    projectId: PROJECT_ID,
  });
  const app = getApp();
  const tokenResult = await app.options.credential.getAccessToken();
  const token = tokenResult && tokenResult.access_token;
  if (!token) {
    note('FAILED: could not mint an access token from the service account credential.');
    writeNotes();
    process.exit(1);
  }
  const authHeaders = { Authorization: 'Bearer ' + token };
  note('Access token minted: yes (value withheld).');

  const webAppsUrl = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`;

  note('');
  note('## Step 3: list web apps');
  note('GET ' + webAppsUrl);
  let res = await fetch(webAppsUrl, { headers: authHeaders });
  let bodyText = await res.text();
  note('HTTP status: ' + res.status);
  note('Response body: ' + redactSecrets(bodyText));
  if (!res.ok) {
    await fail(res.status, bodyText, 'list web apps');
  }
  let listData = JSON.parse(bodyText);
  let apps = Array.isArray(listData.apps) ? listData.apps : [];

  if (apps.length === 0) {
    note('Web apps list is empty. Creating a web app.');
    note('POST ' + webAppsUrl);
    note('Request body: {"displayName": "EduBuddy Web"}');
    res = await fetch(webAppsUrl, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'EduBuddy Web' }),
    });
    bodyText = await res.text();
    note('HTTP status: ' + res.status);
    note('Response body: ' + redactSecrets(bodyText));
    if (!res.ok) {
      await fail(res.status, bodyText, 'create web app');
    }
    note('Waiting 8 seconds for the new web app to propagate.');
    await sleep(8000);
    note('GET ' + webAppsUrl + ' (retry list)');
    res = await fetch(webAppsUrl, { headers: authHeaders });
    bodyText = await res.text();
    note('HTTP status: ' + res.status);
    note('Response body: ' + redactSecrets(bodyText));
    if (!res.ok) {
      await fail(res.status, bodyText, 're-list web apps');
    }
    listData = JSON.parse(bodyText);
    apps = Array.isArray(listData.apps) ? listData.apps : [];
    if (apps.length === 0) {
      await fail('n/a', 'Web apps list still empty after create and wait.', 're-list web apps');
    }
  }

  const webApp = apps[0];
  const appId = webApp.appId;
  note(`Using first web app: appId=${appId}, displayName=${webApp.displayName || 'n/a'}`);

  note('');
  note('## Step 4: fetch public web app config');
  const configUrl = `${webAppsUrl}/${appId}/config`;
  note('GET ' + configUrl);
  res = await fetch(configUrl, { headers: authHeaders });
  bodyText = await res.text();
  note('HTTP status: ' + res.status);
  note('Response body: ' + redactSecrets(bodyText));
  if (!res.ok) {
    await fail(res.status, bodyText, 'get web app config');
  }
  const rawConfig = JSON.parse(bodyText);
  const publicConfig = {
    projectId: rawConfig.projectId,
    appId: rawConfig.appId,
    apiKey: rawConfig.apiKey,
    authDomain: rawConfig.authDomain,
  };
  if (rawConfig.messagingSenderId) {
    publicConfig.messagingSenderId = rawConfig.messagingSenderId;
  }
  note('Extracted public config: ' + JSON.stringify(publicConfig, null, 2));

  note('');
  note('## Step 5: Email/Password provider state');
  const idtUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;
  note('GET ' + idtUrl);
  res = await fetch(idtUrl, { headers: authHeaders });
  bodyText = await res.text();
  note('HTTP status: ' + res.status);
  note('Response body: ' + redactSecrets(bodyText));
  if (!res.ok) {
    await fail(res.status, bodyText, 'get Identity Toolkit config');
  }
  const idtConfig = JSON.parse(bodyText);
  const before = Boolean(idtConfig.signIn && idtConfig.signIn.email && idtConfig.signIn.email.enabled);
  note(`Email/Password enabled BEFORE: ${before}`);

  let after = before;
  if (!before) {
    note('Email/Password is disabled. PATCHing to enable it.');
    note('PATCH ' + idtUrl + '?updateMask=signIn.email.enabled');
    note('Request body: {"signIn": {"email": {"enabled": true}}}');
    res = await fetch(idtUrl + '?updateMask=signIn.email.enabled', {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ signIn: { email: { enabled: true } } }),
    });
    bodyText = await res.text();
    note('HTTP status: ' + res.status);
    note('Response body: ' + redactSecrets(bodyText));
    if (!res.ok) {
      await fail(res.status, bodyText, 'patch Identity Toolkit config');
    }
  } else {
    note('Email/Password already enabled. No PATCH needed.');
  }

  note('Re-GET ' + idtUrl + ' to confirm.');
  res = await fetch(idtUrl, { headers: authHeaders });
  bodyText = await res.text();
  note('HTTP status: ' + res.status);
  note('Response body: ' + redactSecrets(bodyText));
  if (!res.ok) {
    await fail(res.status, bodyText, 'confirm Identity Toolkit config');
  }
  const idtConfigAfter = JSON.parse(bodyText);
  after = Boolean(idtConfigAfter.signIn && idtConfigAfter.signIn.email && idtConfigAfter.signIn.email.enabled);
  note(`Email/Password enabled AFTER: ${after}`);

  note('');
  note('## Step 6: write outputs');
  const outPayload = { ...publicConfig, emailPasswordEnabled: after };
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(outPayload, null, 2) + '\n', 'utf8');
  note('Wrote ' + OUT_JSON + ' with: ' + JSON.stringify(outPayload, null, 2));
  note('Provider state: before=' + before + ', after=' + after);

  note('');
  note('Done. All REST calls succeeded.');
  writeNotes();
}

main().catch(async (err) => {
  const msg = (err && err.stack) ? err.stack : String(err);
  note('');
  note('UNEXPECTED ERROR (no HTTP response context or unhandled). Stopping, nothing guessed.');
  note(msg);
  writeNotes();
  process.exit(1);
});
