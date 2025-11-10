// services/authService.js

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
    // In this simplified version, we only check for a guest session.
    const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
    if (guestSession) {
        currentUserState = JSON.parse(guestSession);
    } else {
        currentUserState = null;
    }
    notifyStateChange();
};

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
    // The entire app now runs in guest mode if a session is active.
    return currentUserState !== null;
};

export const getCurrentUser = () => {
    return currentUserState;
};


// --- FIREBASE-DEPENDENT FUNCTIONS (DISABLED) ---

export const signUp = async (email, password, username) => {
    // This functionality is disabled.
    throw { code: 'auth/unavailable', message: "User registration is currently disabled." };
};

export const logIn = async (email, password) => {
    // This functionality is disabled.
    throw { code: 'auth/unavailable', message: "Login is currently disabled." };
};

export const logOut = async () => {
    // In the guest-only version, logout simply clears the guest session.
    localStorage.removeItem(GUEST_SESSION_KEY);
    currentUserState = null;
    notifyStateChange();
};

export const updateUserAccount = async (profileData) => {
    // This would update a user's profile in Firestore.
    // It does nothing in guest mode.
    console.warn("updateUserAccount called in guest-only mode. No action taken.");
    return;
};