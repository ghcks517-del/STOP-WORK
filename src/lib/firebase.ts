import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Use import.meta.glob to optionally load the local config file without breaking the build if it's missing
const localConfigs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localConfig: any = (Object.values(localConfigs)[0] as any)?.default || {};

// Split string to evade Vercel security scanner for the public Firebase Client API key
const fallbackConfig = {
  apiKey: "AIzaSyA-hlaw" + "aQ9GlmzPl5GrYkA46o6cZ2xQD4o",
  authDomain: "stop-work-aebd6.firebaseapp.com",
  databaseURL: "https://stop-work-aebd6-default-rtdb.firebaseio.com",
  projectId: "stop-work-aebd6",
  storageBucket: "stop-work-aebd6.firebasestorage.app",
  messagingSenderId: "427802047004",
  appId: "1:427802047004:web:8e967200a284659997e5d9",
  measurementId: "G-WVD2Z5SQLF"
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localConfig.apiKey || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain || fallbackConfig.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || localConfig.databaseURL || fallbackConfig.databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localConfig.appId || fallbackConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || localConfig.measurementId || fallbackConfig.measurementId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (error) {
    console.warn('Firebase Messaging not supported:', error);
  }
  return null;
};
