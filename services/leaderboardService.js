import { getProgress } from './progressService.js';

const AI_PLAYERS_KEY = 'knowledgeTesterAiPlayers';

const aiPlayerNames = [
    "Nova", "Orion", "Cygnus", "Vega", "Sirius", "Raptor", "Kestrel", "Apex", "Vortex",
    "Helios", "Titan", "Zenith", "Spectra", "Echo", "Juno", "Pulsar"
];

// Generates a set of AI players with varying skill levels
function generateAiPlayers() {
    const players = aiPlayerNames.map(name => ({
        name: `Agent ${name}`,
        // Skill determines how much XP they "earn" per day
        skill: Math.random() * 0.7 + 0.3, // Skill from 0.3 to 1.0
        weeklyXP: 0
    }));

    const today = new Date().toISOString().split('T')[0];
    const state = { date: today, players };
    localStorage.setItem(AI_PLAYERS_KEY, JSON.stringify(state));
    return players;
}

// Simulates daily progress for AI players
function updateAiPlayers(players) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday is 0

    players.forEach(player => {
        // Simple simulation: XP increases based on skill, with some randomness
        const dailyGain = Math.floor(player.skill * (Math.random() * 500 + 200));
        player.weeklyXP += dailyGain;
    });

    const state = { date: today.toISOString().split('T')[0], players };
    localStorage.setItem(AI_PLAYERS_KEY, JSON.stringify(state));
    return players;
}

function getAiPlayers() {
    const stored = localStorage.getItem(AI_PLAYERS_KEY);
    if (stored) {
        const state = JSON.parse(stored);
        const today = new Date().toISOString().split('T')[0];
        
        // Reset weekly XP at the start of a new week (handled by progressService for the user)
        const currentWeekId = getWeekId(new Date());
        const storedWeekId = getWeekId(new Date(state.date));
        if (currentWeekId !== storedWeekId) {
            return generateAiPlayers();
        }

        // Update scores if it's a new day
        if (state.date !== today) {
            return updateAiPlayers(state.players);
        }
        return state.players;
    }
    return generateAiPlayers();
}

// Helper to get week ID, consistent with progressService
const getWeekId = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};


export function getLeaderboardData() {
    const progress = getProgress();
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

    const userEntry = {
        name: profile.name || 'You',
        weeklyXP: progress.stats.weeklyXP,
        isUser: true
    };

    const aiPlayers = getAiPlayers();

    const allPlayers = [userEntry, ...aiPlayers];
    
    allPlayers.sort((a, b) => b.weeklyXP - a.weeklyXP);

    return allPlayers;
}