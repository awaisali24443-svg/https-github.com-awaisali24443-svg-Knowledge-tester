import { isGuest } from './authService.js';

// This service is now a placeholder for when Firebase is re-enabled.
// It would interact with user documents to calculate weekly XP.

export async function getLeaderboardData() {
    if (isGuest()) {
        // Leaderboard is a social feature, not available for guests.
        return [];
    }
    
    console.warn("Leaderboard fetching is disabled (Firebase not connected).");

    // Placeholder data for logged-in user when Firebase is offline
    return [
        { rank: 1, name: "AI Champion", weeklyXP: 1050 },
        { rank: 2, name: "Quiz Master", weeklyXP: 980 },
        { rank: 3, name: "Pro Learner", weeklyXP: 850 },
        { rank: '...', name: '...', weeklyXP: '...' },
        { rank: 42, name: "You", weeklyXP: 120, isUser: true },
    ];
}
