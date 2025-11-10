// firebase-config.js

// IMPORTANT: This file is currently NOT USED by the application.
// Firebase integration has been temporarily removed to focus on guest-only functionality.
// To re-enable user accounts, you must:
// 1. Fill in your Firebase project credentials below.
// 2. Restore the Firebase logic in /services/authService.js.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ---
// You can get this from your project's settings in the Firebase console.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};


let firebaseApp, auth, db;

export const initializeFirebase = () => {
    // Only initialize if it hasn't been already
    if (firebaseApp) {
        return { firebaseApp, auth, db };
    }

    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.warn("Firebase is not configured. User accounts are disabled.");
        return { firebaseApp: null, auth: null, db: null };
    }

    try {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        return { firebaseApp: null, auth: null, db: null };
    }
    
    return { firebaseApp, auth, db };
};