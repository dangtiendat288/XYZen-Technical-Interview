import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth/';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjj0vcKDo9FHbKuOC7SE68zgPfFAG3tJE",
    authDomain: "xyzen-tech-interview.firebaseapp.com",
    projectId: "xyzen-tech-interview",
    storageBucket: "xyzen-tech-interview.firebasestorage.app",
    messagingSenderId: "973770647423",
    appId: "1:973770647423:web:b09d9f81316bfa1b239c4a",
    measurementId: "G-N2T2LSDNFC"
};

// Initialize Firebase
let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };