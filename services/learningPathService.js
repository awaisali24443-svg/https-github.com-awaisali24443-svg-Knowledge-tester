import { LOCAL_STORAGE_KEYS } from '../constants.js';
import * as apiService from './apiService.js';

let gameProgress = [];

/**
 * Loads game progress from localStorage.
 * @private
 */
function loadProgress() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GAME_PROGRESS);
        gameProgress = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load game progress:", e);
        gameProgress = [];
    }
}

/**
 * Saves the current game progress to localStorage.
 * @private
 */
function saveProgress() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.GAME_PROGRESS, JSON.stringify(gameProgress));
    } catch (e) {
        console.error("Failed to save game progress:", e);
    }
}

/**
 * Initializes the service by loading data from localStorage.
 * Should be called once on application startup.
 */
export function init() {
    loadProgress();
}

/**
 * Retrieves all saved game journeys.
 * @returns {Array<object>} An array of journey objects.
 */
export function getAllJourneys() {
    return gameProgress;
}

/**
 * Finds a specific journey by its ID.
 * @param {string} id - The ID of the journey.
 * @returns {object|undefined} The found journey object, or undefined.
 */
export function getJourneyById(id) {
    return gameProgress.find(p => p.id === id);
}

/**
 * Finds a specific journey by its goal (case-insensitive).
 * @param {string} goal - The goal of the journey (topic name).
 * @returns {object|undefined} The found journey object, or undefined.
 */
export function getJourneyByGoal(goal) {
    if (!goal) return undefined;
    const lowerCaseGoal = goal.toLowerCase();
    return gameProgress.find(p => p.goal.toLowerCase() === lowerCaseGoal);
}

/**
 * Gets an existing journey for a topic or creates a new one by calling the AI if it doesn't exist.
 * This is now an asynchronous operation.
 * @param {string} goal - The user-defined goal for the learning journey (topic name).
 * @returns {Promise<object>} A promise that resolves to the existing or newly created journey object.
 * @throws {Error} If API call fails.
 */
export async function startOrGetJourney(goal) {
    const existingJourney = getJourneyByGoal(goal);
    if (existingJourney) {
        return existingJourney;
    }
    
    // If it doesn't exist, generate a plan from the AI
    const plan = await apiService.generateJourneyPlan(goal);
    
    const newJourney = {
        id: `journey_${Date.now()}`,
        goal,
        description: plan.description, // Use AI-generated description
        currentLevel: 1,
        totalLevels: plan.totalLevels, // Use AI-determined level count
        createdAt: new Date().toISOString(),
    };
    
    gameProgress.unshift(newJourney); // Add to the beginning for chronological display
    saveProgress();
    return newJourney;
}

/**
 * Advances the user's progress in a journey to the next level.
 * @param {string} journeyId - The ID of the journey to update.
 */
export function completeLevel(journeyId) {
    const journey = getJourneyById(journeyId);
    if (journey && journey.currentLevel <= journey.totalLevels) {
        journey.currentLevel += 1;
        saveProgress();
    }
}

/**
 * Deletes a journey from storage.
 * @param {string} journeyId - The ID of the journey to delete.
 */
export function deleteJourney(journeyId) {
    gameProgress = gameProgress.filter(p => p.id !== journeyId);
    saveProgress();
}