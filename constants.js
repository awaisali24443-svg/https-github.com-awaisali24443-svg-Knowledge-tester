
export const LOCAL_STORAGE_KEYS = {
    CONFIG: 'knowledge-tester-config',
    LIBRARY: 'knowledge-tester-library',
    GAME_PROGRESS: 'knowledge-tester-game-progress',
    HISTORY: 'knowledge-tester-history',
    GAMIFICATION: 'knowledge-tester-gamification',
};

// Re-enabling all features and routes for the full application experience.
export const FEATURES = {
    LEARNING_PATHS: true,
    AURAL_MODE: true,
};

export const ROUTES = [
    // Main navigation routes
    { path: '/', module: 'home', name: 'Home', icon: 'home', nav: true },
    { path: '/topics', module: 'topic-list', name: 'Journeys', icon: 'git-branch', nav: true },
    { path: '/library', module: 'library', name: 'Library', icon: 'book', nav: true },
    { path: '/history', module: 'history', name: 'History', icon: 'archive', nav: true },
    { path: '/aural', module: 'aural', name: 'Aural Tutor', icon: 'mic', nav: true, fullBleed: true },

    // Footer/Settings routes
    { path: '/profile', module: 'profile', name: 'Settings', icon: 'settings', nav: true, footer: true },

    // Non-navigational routes (part of application flow)
    { path: '/loading', module: 'loading', name: 'Loading', nav: false },
    { path: '/quiz', module: 'quiz', name: 'Quiz', nav: false },
    { path: '/results', module: 'results', name: 'Results', nav: false },
    { path: '/study', module: 'study', name: 'Study Session', nav: false },
    { path: '/game/:topic', module: 'game-map', name: 'Game Map', nav: false },
    { path: '/level', module: 'game-level', name: 'Game Level', nav: false, fullBleed: true },
];
