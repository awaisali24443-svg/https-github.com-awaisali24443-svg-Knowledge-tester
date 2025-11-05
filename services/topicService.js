/**
 * topicService.js
 * 
 * This service acts as a single source of truth for all quiz topic and category data.
 * By centralizing this configuration, we ensure consistency across different modules
 * (like topic selection and progress tracking) and make it easy to add or modify content.
 */

export const categoryData = {
    programming: {
        title: "Programming Quizzes",
        categoryTitle: "Programming Languages", // Title used on the progress screen
        subtitle: "Select a language to test your expertise and unlock new levels.",
        returnHash: '#topics/programming',
        topics: [
            { name: "Python", icon: "🐍", description: "Data science, web dev, scripting" },
            { name: "JavaScript", icon: "🟨", description: "The language of the web" },
            { name: "Java", icon: "☕", description: "Enterprise-level applications" },
            { name: "SQL", icon: "🗃️", description: "Database management" },
            { name: "TypeScript", icon: "🟦", description: "JavaScript with static types" },
            { name: "C++", icon: "⚙️", description: "Performance-critical systems" },
        ]
    },
    history: {
        title: "Historical Knowledge",
        categoryTitle: "Historical Knowledge",
        subtitle: "Journey through time and test your knowledge of the past.",
        returnHash: '#topics/history',
        topics: [
            { name: "Ancient Rome", icon: "🏛️", description: "Republic, Empire, and legacy" },
            { name: "Ancient Egypt", icon: "🏺", description: "Pharaohs, pyramids, and the Nile" },
            { name: "The Mughal Empire", icon: "🕌", description: "Art, architecture, and empire in India" },
            { name: "The Ottoman Empire", icon: "🌙", description: "A global power for six centuries" },
        ]
    },
    science: {
        title: "Science Quizzes",
        categoryTitle: "Science",
        subtitle: "Explore the wonders of the natural world and human ingenuity.",
        returnHash: '#topics/science',
        topics: [
            { name: "Biology", icon: "🧬", description: "The study of life and living organisms" },
            { name: "Chemistry", icon: "🧪", description: "Matter, atoms, and reactions" },
            { name: "Science Inventions", icon: "💡", description: "Discoveries that changed the world" },
        ]
    },
    technology: {
        title: "Technology Quizzes",
        categoryTitle: "Technology",
        subtitle: "Explore the innovations that shape our world and the cosmos.",
        returnHash: '#topics/technology',
        topics: [
            { name: "AI and Technology", icon: "🤖", description: "The cutting-edge of innovation" },
            { name: "Space and Astronomy", icon: "🔭", description: "The final frontier and its wonders" },
        ]
    }
};
