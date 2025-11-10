import { isGuest } from './authService.js';

// This service is a placeholder for when Firebase is re-enabled.
// It requires Firestore's real-time capabilities to function.

export async function createChallenge() {
    if (isGuest()) throw new Error("You must be signed in to create a live challenge.");
    console.warn("Live challenge creation is disabled (Firebase not connected).");
    return "DEMO1"; // Return a dummy code
}

export async function joinChallenge(gameCode) {
    if (isGuest()) throw new Error("You must be signed in to join a live challenge.");
    console.warn("Live challenge joining is disabled (Firebase not connected).");
    return { success: true };
}

export function subscribeToChallenge(gameCode, onUpdate) {
    if (isGuest()) return () => {}; // Return an empty unsubscribe function
    console.warn("Live challenge subscription is disabled (Firebase not connected).");
    // Dummy interval to simulate players joining for demo purposes
    const interval = setInterval(() => {
        onUpdate({
            status: 'waiting',
            players: [{name: 'You'}, {name: 'AI Player 1'}, {name: 'AI Player 2'}]
        });
    }, 2000);

    return () => clearInterval(interval);
}

// Other functions (startGame, submitAnswer) would be here
// but are omitted as they require a full Firebase backend.
