// firebase-config.js

// This file is now designed to be imported dynamically ONLY when Firebase is needed.
// It should not be imported at the top level of the application's startup sequence.

// We will use dynamic imports for Firebase to ensure it's only loaded on-demand.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let firebaseApp, auth, db;

// This function will fetch the config from the server.
// This is the secure way to get client-side keys without exposing them in the repo.
// For now, it will fail gracefully until you set up the endpoint and keys.
async function getFirebaseConfig() {
    // In a real production app, you would fetch this from a secure server endpoint.
    // For now, to allow the app to run without your keys, we'll return an empty object.
    // When you are ready to add Firebase, you will replace this with your actual config.
    // Example:
    /*
    return {
        apiKey: "AIza...",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "...",
        appId: "..."
    };
    */
    // For now, this allows the app to function without crashing.
    console.warn("Firebase config is not set. Login/Signup will not work until configured.");
    return null; 
}


export const initializeFirebase = async () => {
    // Only initialize if it hasn't been already
    if (!firebaseApp) {
        const firebaseConfig = await getFirebaseConfig();
        // Only proceed if a valid config is returned
        if (firebaseConfig) {
            try {
                firebaseApp = initializeApp(firebaseConfig);
                auth = getAuth(firebaseApp);
                db = getFirestore(firebaseApp);
            } catch (error) {
                console.error("Firebase initialization failed:", error);
                // Return nulls so the app knows initialization failed
                return { firebaseApp: null, auth: null, db: null };
            }
        } else {
             return { firebaseApp: null, auth: null, db: null };
        }
    }
    return { firebaseApp, auth, db };
};
