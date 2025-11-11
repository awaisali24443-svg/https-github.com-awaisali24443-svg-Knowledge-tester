
// services/searchService.js
import { getCategories, getTopicsForCategory } from './topicService.js';

let searchIndex = [];
let isIndexBuilt = false;

/**
 * Fetches all data and builds a flat, searchable index.
 * This should be called once when the application initializes.
 */
export async function createIndex() {
    if (isIndexBuilt) return;

    try {
        const categories = await getCategories();
        const allTopicsPromises = categories.map(cat => getTopicsForCategory(cat.id));
        const allTopicsArrays = await Promise.all(allTopicsPromises);

        const newIndex = [];

        // Add categories to the index
        categories.forEach(cat => {
            newIndex.push({
                type: 'category',
                id: cat.id,
                name: cat.name,
                description: cat.description,
                icon: cat.icon,
                href: `/#topics/${cat.id}`
            });
        });

        // Add topics to the index, linking them to their category
        categories.forEach((cat, i) => {
            const topics = allTopicsArrays[i];
            topics.forEach(topic => {
                newIndex.push({
                    type: 'topic',
                    id: topic.id,
                    name: topic.name,
                    description: `A quiz about ${topic.name} from the ${cat.name} category.`,
                    icon: '🧠',
                    href: `/#loading`, // Topics go to loading screen
                    topic: topic.name // Store topic name for context
                });
            });
        });
        
        searchIndex = newIndex;
        isIndexBuilt = true;
        console.log(`Search index built with ${searchIndex.length} items.`);

    } catch (error) {
        console.error("Failed to build search index:", error);
    }
}

/**
 * Searches the index for a given query.
 * @param {string} query The search term.
 * @returns {Array} An array of matching items from the index.
 */
export function search(query) {
    if (!isIndexBuilt || !query) {
        return [];
    }
    
    const lowerCaseQuery = query.toLowerCase().trim();
    
    return searchIndex.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(lowerCaseQuery);
        const descriptionMatch = item.description.toLowerCase().includes(lowerCaseQuery);
        return nameMatch || descriptionMatch;
    });
}
