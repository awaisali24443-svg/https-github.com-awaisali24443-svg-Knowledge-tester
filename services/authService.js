// services/authService.js
import { initializeFirebase } from '../firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const GUEST_SESSION_KEY = 'guestSession';
let onSessionStateChangeCallback = () => {};
let currentUserState = null;

// --- STATE MANAGEMENT ---

export const onSessionStateChange = (callback) => {
    onSessionStateChangeCallback = callback;
};

const notifyStateChange = () => {
    if (onSessionStateChangeCallback) {
        onSessionStateChangeCallback(currentUserState);
    }
};

export const initializeSession = () => {
    // This function is called once on app startup to determine the initial auth state.
    const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
    const { auth } = initializeFirebase();

    if (auth && auth.currentUser) {
        // If there's an active Firebase session, it takes precedence.
        currentUserState = auth.currentUser;
        localStorage.removeItem(GUEST_SESSION_KEY);
    } else if (guestSession) {
        // Otherwise, check for a guest session.
        currentUserState = JSON.parse(guestSession);
    } else {
        // No user is logged in.
        currentUserState = null;
    }
    attachFirebaseListener();
    notifyStateChange();
}

// --- GUEST SESSION ---

export const startGuestSession = () => {
    const session = {
        uid: `guest_${Date.now()}`,
        isGuest: true,
        displayName: 'Guest',
    };
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    currentUserState = session;
    notifyStateChange();
    return session;
};

export const isGuest = () => {
    return currentUserState?.isGuest === true;
};

export const getCurrentUser = () => {
    return currentUserState;
};

// --- FIREBASE FUNCTIONS ---

export const signUp = async (email, password, username) => {
    const { auth, db } = initializeFirebase();
    if (!auth || !db) {
        throw { code: 'auth/unavailable', message: "User registration is currently disabled." };
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: username });

    // Create a new user profile document in Firestore
    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        createdAt: new Date().toISOString(),
        isNewUser: true // Flag for welcome modal
    });
    
    localStorage.removeItem(GUEST_SESSION_KEY);
    return userCredential;
};

export const logIn = async (email, password) => {
    const { auth } = initializeFirebase();
    if (!auth) {
        throw { code: 'auth/unavailable', message: "Login is currently disabled." };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem(GUEST_SESSION_KEY);
    return userCredential;
};

export const logOut = async () => {
    if (isGuest()) {
        localStorage.removeItem(GUEST_SESSION_KEY);
        currentUserState = null;
    } else {
        const { auth } = initializeFirebase();
        if (auth) {
            await signOut(auth);
            // onAuthStateChanged will set currentUserState to null
        }
    }
    notifyStateChange();
};

export const updateUserAccount = async (profileData) => {
    if (isGuest() || !currentUserState) return;

    const { db } = initializeFirebase();
    if (!db) return;
    
    const userRef = doc(db, "users", currentUserState.uid);
    await updateDoc(userRef, profileData);
};


// Attaches the Firebase listener to respond to live auth changes.
function attachFirebaseListener() {
    const { auth, db } = initializeFirebase();
    
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch full user profile from Firestore to get custom fields like isNewUser
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userProfile = userDoc.exists() ? userDoc.data() : {};

                currentUserState = { ...user, ...userProfile };
                localStorage.removeItem(GUEST_SESSION_KEY);
            } else {
                // If user logged out, only clear state if not in guest mode
                if (!isGuest()) {
                    currentUserState = null;
                }
            }
            notifyStateChange();
        });
    } else {
        console.log("Firebase not configured, auth listener not attached.");
    }
}
