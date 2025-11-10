// services/authService.js

// Firebase is NOT imported at the top level anymore. This is crucial.

const GUEST_SESSION_KEY = 'guestSession';
let onSessionStateChangeCallback = () => {};
let currentUserState = null;

// NEW: This is the single source of truth for auth state.
export const onSessionStateChange = (callback) => {
    onSessionStateChangeCallback = callback;
    // Check initial state when listener is attached.
    const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
    currentUserState = guestSession ? JSON.parse(guestSession) : null;
    notifyStateChange();
};

// Helper to notify the app of a change.
const notifyStateChange = () => {
    if (onSessionStateChangeCallback) {
        onSessionStateChangeCallback(currentUserState);
    }
};

// --- Guest Session Management ---

const createGuestSession = () => {
    return {
        uid: `guest_${Date.now()}`,
        isGuest: true,
        displayName: 'Guest',
    };
};

export const startGuestSession = () => {
    const session = createGuestSession();
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    currentUserState = session;
    notifyStateChange();
    return session;
};

export const isGuest = () => {
    return currentUserState?.isGuest === true;
};

// --- Unified User Management ---

export const getCurrentUser = () => {
    return currentUserState;
};

// --- Firebase Functions ---
// These functions will now load and initialize Firebase on demand.

export const signUp = async (email, password, username) => {
    // Dynamically import Firebase services ONLY when needed.
    const { initializeFirebase } = await import('../firebase-config.js');
    const { auth, db } = await initializeFirebase();

    if (!auth || !db) {
        throw new Error("Firebase is not configured. Cannot sign up.");
    }
    
    const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: username });

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        createdAt: new Date().toISOString(),
        bio: '',
        pictureURL: '',
        isNewUser: true
    });

    localStorage.removeItem(GUEST_SESSION_KEY);
    currentUserState = user;
    notifyStateChange();
    return userCredential;
};

export const logIn = async (email, password) => {
    const { initializeFirebase } = await import('../firebase-config.js');
    const { auth } = await initializeFirebase();
    
    if (!auth) {
        throw new Error("Firebase is not configured. Cannot log in.");
    }

    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem(GUEST_SESSION_KEY);
    currentUserState = userCredential.user;
    notifyStateChange();
    return userCredential;
};

export const logOut = async () => {
    if (isGuest()) {
        localStorage.removeItem(GUEST_SESSION_KEY);
        currentUserState = null;
    } else {
        const { initializeFirebase } = await import('../firebase-config.js');
        const { auth } = await initializeFirebase();
        if (auth) {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
            await signOut(auth);
        }
        currentUserState = null;
    }
    notifyStateChange();
};

// This function will be called from global.js to hook into the live Firebase state
// ONLY if Firebase has been initialized.
export async function attachFirebaseListener() {
    try {
        const { initializeFirebase } = await import('../firebase-config.js');
        const { auth } = await initializeFirebase();
        if (auth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    localStorage.removeItem(GUEST_SESSION_KEY);
                    currentUserState = user;
                }
                // We notify even if user is null (on logout)
                notifyStateChange();
            });
        }
    } catch (e) {
        console.error("Could not attach Firebase listener", e);
    }
}
