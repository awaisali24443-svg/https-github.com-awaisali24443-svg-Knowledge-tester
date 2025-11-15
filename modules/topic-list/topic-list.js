import * as searchService from '../../services/searchService.js';

let appState;
let searchInput, topicGrid, customTopicContainer, template;

// --- UI Rendering & Event Listeners ---

function renderTopics(topics, query = '') {
    topicGrid.innerHTML = '';
    customTopicContainer.innerHTML = '';
    
    if (topics.length === 0 && query) {
        customTopicContainer.innerHTML = `
            <div class="card topic-card custom-generator-card" data-topic="${query}" tabindex="0" role="button">
                <div class="card-content">
                    <h3>Start a journey for "${query}"</h3>
                    <p>The AI can build a 100-level game for any topic you can imagine.</p>
                </div>
            </div>
        `;
        return;
    }

    topics.forEach((topic, index) => {
        const card = template.content.cloneNode(true);
        const cardEl = card.querySelector('.topic-card');
        cardEl.dataset.topic = topic.name;
        cardEl.style.animationDelay = `${index * 20}ms`;
        
        card.querySelector('.topic-name').textContent = topic.name;
        card.querySelector('.category-tag').textContent = topic.category;
        card.querySelector('.difficulty-tag').textContent = topic.difficulty;
        
        topicGrid.appendChild(card);
    });
}

function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    const originalQuery = searchInput.value.trim();
    const allTopics = searchService.getIndex();

    if (!query) {
        renderTopics(allTopics);
        return;
    }
    const filteredTopics = allTopics.filter(topic =>
        topic.name.toLowerCase().includes(query) ||
        topic.category.toLowerCase().includes(query)
    );
    renderTopics(filteredTopics, originalQuery);
}

function handleGridInteraction(event) {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    
    const card = event.target.closest('.topic-card');
    if (!card) return;

    event.preventDefault();
    const topic = card.dataset.topic;
    
    // Set context and navigate to the game map for the selected topic
    appState.context = { topic };
    window.location.hash = `#/game/${encodeURIComponent(topic)}`;
}


export async function init(globalState) {
    appState = globalState;
    searchInput = document.getElementById('search-input');
    topicGrid = document.getElementById('topic-grid-container');
    customTopicContainer = document.getElementById('custom-topic-container');
    template = document.getElementById('topic-card-template');

    searchInput.addEventListener('input', handleSearch);
    topicGrid.addEventListener('click', handleGridInteraction);
    topicGrid.addEventListener('keydown', handleGridInteraction);
    customTopicContainer.addEventListener('click', handleGridInteraction);
    customTopicContainer.addEventListener('keydown', handleGridInteraction);
    
    try {
        const allTopics = searchService.getIndex();
        renderTopics(allTopics);
    } catch (error) {
        topicGrid.innerHTML = `<p class="error-message">Could not load topics. Please try again later.</p>`;
    }
}

export function destroy() {
    // DOM elements are removed, so event listeners on them are automatically cleaned up.
}