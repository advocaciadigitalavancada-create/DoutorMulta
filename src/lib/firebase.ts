import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "doutor-multa-app-5544",
  appId: "1:1042349831971:web:4950dfa5ab6c0f9ac0fe96",
  storageBucket: "doutor-multa-app-5544.firebasestorage.app",
  apiKey: "AIzaSyAAmcx4Cu8cU_yO1nTluTgLlvBadGmxpGM",
  authDomain: "doutor-multa-app-5544.firebaseapp.com",
  messagingSenderId: "1042349831971"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
