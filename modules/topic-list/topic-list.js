
import * as apiService from '../../services/apiService.js';
import * as stateService from '../../services/stateService.js';
import * as modalService from '../../services/modalService.js';
import { showToast } from '../../services/toastService.js';

let topicGrid, template, journeyCreatorForm;

// --- UI Rendering & Event Listeners ---

function renderTopics(topics) {
    topicGrid.innerHTML = '';
    
    if (!topics || topics.length === 0) {
        topicGrid.innerHTML = `<p>No topics available at the moment. Please try again later.</p>`;
        return;
    }

    topics.forEach((topic, index) => {
        const card = template.content.cloneNode(true);
        const cardEl = card.querySelector('.topic-card');
        cardEl.dataset.topic = topic.name;
        cardEl.classList.add(topic.styleClass);
        cardEl.style.animationDelay = `${index * 30}ms`;
        
        card.querySelector('.topic-name').textContent = topic.name;
        card.querySelector('.topic-description').textContent = topic.description;
        
        topicGrid.appendChild(card);
    });
}

function handleTopicSelection(topic) {
    if (!topic) return;
    // Set context and navigate to the game map for the selected topic
    stateService.setNavigationContext({ topic });
    window.location.hash = `#/game/${encodeURIComponent(topic)}`;
}

function handleGridInteraction(event) {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    
    const card = event.target.closest('.topic-card');
    if (!card) return;

    event.preventDefault();
    const topic = card.dataset.topic;
    handleTopicSelection(topic);
}

async function handleJourneyCreatorSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('custom-topic-input');
    const topic = input.value.trim();
    if (!topic) return;

    const button = journeyCreatorForm.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('span');
    const buttonIcon = button.querySelector('svg');
    const originalButtonText = buttonText.textContent;
    const originalIconHTML = buttonIcon.innerHTML;

    // Show loading state on button
    button.disabled = true;
    buttonText.textContent = 'Generating...';
    buttonIcon.innerHTML = `<use href="/assets/icons/feather-sprite.svg#cpu"/>`;

    try {
        // 1. Generate the journey plan to get totalLevels and a better description
        const plan = await apiService.generateJourneyPlan(topic);

        // 2. Generate the curriculum outline based on the plan
        const outline = await apiService.generateCurriculumOutline({ topic, totalLevels: plan.totalLevels });

        const curriculumHtml = `
            <p>The AI has designed a <strong>${plan.totalLevels}-level journey</strong> for "${topic}". Here is the proposed curriculum:</p>
            <ul class="curriculum-list">
                ${outline.chapters.map(chapter => `<li>${chapter}</li>`).join('')}
            </ul>
        `;

        // 3. Show confirmation modal with the curriculum
        const confirmed = await modalService.showConfirmationModal({
            title: 'Journey Preview',
            message: curriculumHtml,
            confirmText: 'Begin Journey',
            cancelText: 'Cancel'
        });

        // 4. If confirmed, proceed to the journey
        if (confirmed) {
            handleTopicSelection(topic);
        }

    } catch (error) {
        showToast(`Error creating journey: ${error.message}`, 'error');
    } finally {
        // Restore button state
        button.disabled = false;
        buttonText.textContent = originalButtonText;
        buttonIcon.innerHTML = originalIconHTML;
        input.value = ''; // Clear input
    }
}


export async function init() {
    topicGrid = document.getElementById('topic-grid-container');
    template = document.getElementById('topic-card-template');
    journeyCreatorForm = document.getElementById('journey-creator-form');

    topicGrid.addEventListener('click', handleGridInteraction);
    topicGrid.addEventListener('keydown', handleGridInteraction);
    journeyCreatorForm.addEventListener('submit', handleJourneyCreatorSubmit);
    
    try {
        // Fetch topics directly from the API instead of using a pre-built search index
        const allTopics = await apiService.fetchTopics();
        renderTopics(allTopics);
    } catch (error) {
        topicGrid.innerHTML = `<p class="error-message">Could not load topics. Please try again later.</p>`;
    }
}

export function destroy() {
    // DOM elements are removed, so event listeners on them are automatically cleaned up.
}
