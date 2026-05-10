import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory database for demo purposes
// In production, use a persistent database like Firestore or MongoDB
const db = {
  users: {}, // userId -> { id, username, currentChallenge }
  passkeys: {}, // userId -> PasskeyDevice[]
};

const rpName = 'Passkey Standalone Demo';
const rpID = 'localhost'; // Should match your domain
const origin = `http://${rpID}:${port}`;

// --- Registration ---

app.post('/api/auth/register-options', async (req, res) => {
  const { username } = req.body;
  
  if (!username) return res.status(400).json({ error: 'Username required' });

  // Create or get user
  if (!db.users[username]) {
    db.users[username] = { id: username, username };
  }
  const user = db.users[username];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(user.id),
    userName: user.username,
    attestationType: 'none',
    excludeCredentials: (db.passkeys[user.id] || []).map(p => ({
      id: p.credentialID,
      type: 'public-key',
      transports: p.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  db.users[user.id].currentChallenge = options.challenge;
  res.json(options);
});

app.post('/api/auth/register-verify', async (req, res) => {
  const { username, body } = req.body;
  const user = db.users[username];

  if (!user || !user.currentChallenge) {
    return res.status(400).json({ error: 'Challenge missing' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      
      const newPasskey = {
        credentialID: credential.id,
        credentialPublicKey: credential.publicKey,
        counter: credential.counter,
        transports: body.response.transports,
      };

      if (!db.passkeys[user.id]) db.passkeys[user.id] = [];
      db.passkeys[user.id].push(newPasskey);
      
      user.currentChallenge = null;
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Authentication ---

app.post('/api/auth/login-options', async (req, res) => {
  const { username } = req.body;
  const user = db.users[username];

  if (!user) return res.status(404).json({ error: 'User not found' });

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: (db.passkeys[user.id] || []).map(p => ({
      id: p.credentialID,
      type: 'public-key',
      transports: p.transports,
    })),
    userVerification: 'preferred',
  });

  db.users[user.id].currentChallenge = options.challenge;
  res.json(options);
});

app.post('/api/auth/login-verify', async (req, res) => {
  const { username, body } = req.body;
  const user = db.users[username];

  if (!user || !user.currentChallenge) {
    return res.status(400).json({ error: 'Challenge missing' });
  }

  const passkeys = db.passkeys[user.id] || [];
  const passkey = passkeys.find(p => Buffer.from(p.credentialID).toString('base64') === Buffer.from(body.id, 'base64').toString('base64'));

  if (!passkey) return res.status(400).json({ error: 'Passkey not found' });

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: passkey.credentialPublicKey,
        counter: passkey.counter,
      },
    });

    if (verification.verified) {
      passkey.counter = verification.authenticationInfo.newCounter;
      user.currentChallenge = null;
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Standalone Passkey Demo running at http://localhost:${port}`);
});
