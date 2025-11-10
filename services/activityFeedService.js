import { isGuest } from './authService.js';

// This service is now a placeholder for when Firebase is re-enabled.
// In a real app, this would interact with a 'activities' collection in Firestore.

export async function createActivity(activityData) {
    if (isGuest()) {
        // We don't store global activities for guests.
        return;
    }
    console.log("Activity Created (Firebase disabled):", activityData);
    // Firebase logic:
    // const user = getCurrentUser();
    // const activity = {
    //     ...activityData,
    //     userId: user.uid,
    //     username: user.displayName,
    //     timestamp: new Date().toISOString()
    // };
    // await addDoc(collection(db, 'activities'), activity);
}

export async function getRecentActivities() {
    if (isGuest()) {
        return [];
    }
    console.log("Fetching recent activities (Firebase disabled).");
    // Firebase logic would fetch the last 10 activities
    return []; // Return empty array for now
}
