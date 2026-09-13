import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId
});

try {
  const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);
  console.log("Success initializeFirestore");
} catch(e) {
  console.error(e);
}
