import { getCurrentUser } from './authService.js';

const db = firebase.firestore();

/**
 * Fetches leaderboard data from Firestore.
 * Gets the top 10 players by weeklyXP.
 * @returns {Promise<Array<object>>}
 */
export async function getLeaderboardData() {
    const user = getCurrentUser();
    if (!user) return [];

    try {
        const leaderboardQuery = db.collection('users')
            .orderBy('weeklyXP', 'desc')
            .limit(10);
            
        const snapshot = await leaderboardQuery.get();
        
        const leaderboard = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.username,
                weeklyXP: data.weeklyXP,
                isUser: data.uid === user.uid
            };
        });

        // If the current user is not in the top 10, fetch their data and add them
        const userIsInTop10 = leaderboard.some(p => p.isUser);
        if (!userIsInTop10) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                leaderboard.push({
                    name: userData.username,
                    weeklyXP: userData.weeklyXP,
                    isUser: true,
                    rank: '...' // Placeholder for rank
                });
            }
        }
        
        return leaderboard;

    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        window.showToast("Could not load the leaderboard.", "error");
        return [];
    }
}