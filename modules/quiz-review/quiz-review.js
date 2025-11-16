import * as stateService from '../../services/stateService.js';

let context;
let elements = {};

function render() {
    elements.title.textContent = `Reviewing: Level ${context.level}`;
    elements.subtitle.textContent = context.topic;
    elements.backBtn.href = `#/game/${encodeURIComponent(context.topic)}`;

    elements.content.innerHTML = ''; // Clear previous content

    context.questions.forEach((question, index) => {
        const itemNode = elements.template.content.cloneNode(true);
        const itemEl = itemNode.querySelector('.review-item');
        
        itemEl.querySelector('.review-question-text').textContent = question.question;
        itemEl.querySelector('.review-explanation p').textContent = question.explanation;
        
        const optionsContainer = itemEl.querySelector('.review-options');
        const userAnswer = context.userAnswers[index];

        question.options.forEach((optionText, optionIndex) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'review-option';
            
            let iconHtml = '';
            const isCorrect = optionIndex === question.correctAnswerIndex;
            const isSelected = optionIndex === userAnswer;

            if (isCorrect) {
                optionEl.classList.add('correct');
                iconHtml = `<svg class="icon"><use href="/assets/icons/feather-sprite.svg#check-circle"/></svg>`;
            } else if (isSelected) {
                optionEl.classList.add('incorrect');
                iconHtml = `<svg class="icon"><use href="/assets/icons/feather-sprite.svg#x-circle"/></svg>`;
            } else {
                // Neutral state for other incorrect options
                iconHtml = `<svg class="icon" style="color: var(--color-text-secondary);"><use href="/assets/icons/feather-sprite.svg#circle"/></svg>`;
            }
            
            optionEl.innerHTML = `${iconHtml} <span>${optionText}</span>`;
            optionsContainer.appendChild(optionEl);
        });

        elements.content.appendChild(itemNode);
    });
}

export function init() {
    const { navigationContext } = stateService.getState();
    context = navigationContext;

    // Guard against direct navigation to this page
    if (!context || !context.questions || !context.userAnswers) {
        console.warn('No review context found, redirecting to home.');
        window.location.hash = '/';
        return;
    }

    elements = {
        title: document.getElementById('review-title'),
        subtitle: document.getElementById('review-subtitle'),
        content: document.getElementById('review-content'),
        backBtn: document.getElementById('back-to-map-btn'),
        template: document.getElementById('review-item-template'),
    };
    
    render();
}

export function destroy() {
    // No event listeners to clean up
}
