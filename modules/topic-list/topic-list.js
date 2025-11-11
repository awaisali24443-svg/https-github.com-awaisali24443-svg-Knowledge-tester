
import { getTopicsForCategory, getCategoryById } from '../../services/topicService.js';

export async function init(appState) {
    const listContainer = document.getElementById('topic-list-container');
    const categoryTitle = document.getElementById('category-title');
    const categoryDescription = document.getElementById('category-description');
    
    // FIX #2: Read category from the dynamic router's params
    const categoryId = appState.context.params?.categoryId;

    if (!categoryId || !listContainer) {
        console.error("Category ID not found in state or list container not found.");
        listContainer.innerHTML = "<p>Could not load topics for this category.</p>";
        return;
    }

    try {
        const [topics, category] = await Promise.all([
            getTopicsForCategory(categoryId),
            getCategoryById(categoryId)
        ]);
        
        if (category) {
            categoryTitle.textContent = category.name;
            categoryDescription.textContent = category.description;
        }

        if (topics && topics.length > 0) {
            listContainer.innerHTML = topics.map(topic => `
                <a href="#loading" class="topic-item-link" data-topic="${topic.name}">
                    <div class="topic-item">
                        <span class="topic-icon">🧠</span>
                        <span class="topic-name">${topic.name}</span>
                        <span class="topic-arrow">→</span>
                    </div>
                </a>
            `).join('');
            
            // Add event listeners to set the topic and navigate
            listContainer.querySelectorAll('.topic-item-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const selectedTopic = e.currentTarget.dataset.topic;
                    appState.context = { topic: selectedTopic };
                    window.location.hash = e.currentTarget.getAttribute('href');
                });
            });

        } else {
            listContainer.innerHTML = "<p>No topics found for this category.</p>";
        }
    } catch (error) {
        console.error("Error fetching topics:", error);
        listContainer.innerHTML = "<p>An error occurred while loading topics.</p>";
    }
}

export function destroy() {
    // No complex listeners to remove, but good practice to have the function.
    console.log("Topic List module destroyed.");
}
