// =========================================
// Firebase configuration for Agents
// =========================================
// Matches the working implementation in streaming-generator.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

// Firebase config - same as streaming-generator
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/**
 * Get or initialize Firebase app instance
 * This function ensures Firebase is only initialized once
 */
export function getFirebaseApp(): FirebaseApp {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

// Re-export from config for compatibility
export { db, auth, storage } from './config';
