import { getSavedQuestions, removeQuestion } from '../../services/libraryService.js';

let container;

function renderSavedQuestions() {
    const questions = getSavedQuestions();
    const emptyState = document.getElementById('library-empty-state');
    
    if (questions.length === 0) {
        emptyState.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';
    
    // FIX #11: Non-blocking render for large libraries
    let index = 0;
    function renderChunk() {
        const fragment = document.createDocumentFragment();
        let itemsInChunk = 0;
        while (index < questions.length && itemsInChunk < 10) { // Render 10 items per frame
            const q = questions[index];
            const itemEl = document.createElement('div');
            itemEl.className = 'saved-question-item';
            itemEl.innerHTML = `
                <p class="saved-question-text">${q.question}</p>
                <ul class="saved-options-list">
                    ${q.options.map((opt, i) => `
                        <li class="saved-option ${i === q.correctAnswerIndex ? 'correct' : ''}">
                            ${opt}
                        </li>
                    `).join('')}
                </ul>
                <button class="remove-btn" title="Remove from library">&times;</button>
            `;
            
            const removeBtn = itemEl.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => handleRemove(q, itemEl));

            fragment.appendChild(itemEl);
            itemsInChunk++;
            index++;
        }
        container.appendChild(fragment);

        if (index < questions.length) {
            requestAnimationFrame(renderChunk);
        }
    }
    
    requestAnimationFrame(renderChunk);
}

function handleRemove(question, element) {
    removeQuestion(question);
    // Animate removal before re-rendering
    element.style.transition = 'opacity 0.3s, transform 0.3s';
    element.style.opacity = '0';
    element.style.transform = 'translateX(-20px)';
    setTimeout(() => {
        // A simple re-render is easier than complex DOM manipulation
        renderSavedQuestions();
    }, 300);
}

export function init() {
    container = document.getElementById('library-container');
    renderSavedQuestions();
}

export function destroy() {
    console.log("Library module destroyed.");
}
