

export const LOCAL_STORAGE_KEYS = {
    CONFIG: 'knowledge-tester-config',
    LIBRARY: 'knowledge-tester-library',
    GAME_PROGRESS: 'knowledge-tester-game-progress',
    HISTORY: 'knowledge-tester-history',
    GAMIFICATION: 'knowledge-tester-gamification',
};

export const ROUTES = [
    { path: '/', module: 'home', name: 'Home', icon: 'home', nav: true },
    { path: '/topics', module: 'topic-list', name: 'Play', icon: 'zap', nav: true },
    { path: '/profile', module: 'profile', name: 'Profile', icon: 'user', nav: true },
    { path: '/library', module: 'library', name: 'Library', icon: 'book', nav: true },
    { path: '/history', module: 'history', name: 'History', icon: 'archive', nav: true },
    { path: '/study', module: 'study', name: 'Study', nav: false },
    { path: '/aural', module: 'aural', name: 'Aural', icon: 'mic', nav: true, fullBleed: true },
    // New game routes
    { path: '/game/:topic', module: 'game-map', name: 'Game Map', nav: false },
    { path: '/level', module: 'game-level', name: 'Game Level', nav: false, fullBleed: true },
];

// Simple feature flags
export const FEATURES = {
    LEARNING_PATHS: true, // This flag is now used to enable the game journey system
    AURAL_MODE: true,
};