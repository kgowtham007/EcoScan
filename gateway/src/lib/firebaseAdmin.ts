import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK once (guard against re-initialization in tests)
if (!admin.apps.length) {
  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  // Replace escaped newlines that may come from env vars
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export const auth = admin.auth();
export const firestore = admin.firestore();
export default admin;
