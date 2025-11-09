// services/activityFeedService.js
import { getCurrentUser } from './authService.js';
const db = firebase.firestore();

/**
 * Creates a new activity event in the global activity feed.
 * @param {object} activityData - The data for the activity event.
 * Expected properties: { type, text, icon }
 */
export async function createActivity(activityData) {
    const user = getCurrentUser();
    // Don't record activities if there's no user (e.g., guest mode)
    if (!user) return; 

    try {
        const userDocRef = db.collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();

        if (!userData || !userData.username) {
            console.warn("Cannot create activity for user without a username.");
            return;
        }

        const feedCollection = db.collection('activityFeed');
        await feedCollection.add({
            userId: user.uid,
            username: userData.username,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ...activityData,
        });

    } catch (error) {
        // This is a non-critical error, so we just log it and don't bother the user.
        console.error("Could not create activity feed event:", error);
    }
}

/**
 * Fetches the most recent activity feed events.
 * @param {number} limit - The maximum number of activities to fetch.
 * @returns {Promise<Array<object>>} An array of activity objects.
 */
export async function getRecentActivities(limit = 15) {
    const user = getCurrentUser();
    if (!user) return [];

    try {
        const feedCollection = db.collection('activityFeed');
        const snapshot = await feedCollection.orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching activity feed:", error);
        window.showToast("Could not load the activity feed.", "error");
        return [];
    }
}
