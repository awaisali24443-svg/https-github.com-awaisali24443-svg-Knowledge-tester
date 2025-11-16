import * as learningPathService from '../../services/learningPathService.js';

let appState;
let journey;
let elements = {};

function render() {
    elements.title.textContent = `Level ${journey.currentLevel} of ${journey.totalLevels}`;
    
    // Progress calculation based on completed levels
    const progressPercent = Math.round(((journey.currentLevel - 1) / journey.totalLevels) * 100);
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.progressText.textContent = `${progressPercent}%`;
    
    const template = document.getElementById('level-node-template');
    elements.grid.innerHTML = '';

    for (let i = 1; i <= journey.totalLevels; i++) {
        const node = template.content.cloneNode(true);
        const nodeEl = node.querySelector('.level-card');
        
        nodeEl.dataset.level = i;
        nodeEl.style.animationDelay = `${(i -1) * 20}ms`;

        const numberEl = nodeEl.querySelector('.level-number');
        const statusEl = nodeEl.querySelector('.level-status');

        numberEl.textContent = i;

        if (i < journey.currentLevel) {
            nodeEl.classList.add('completed');
            statusEl.textContent = 'Completed';
            nodeEl.setAttribute('aria-label', `Level ${i}: Completed. Click to replay.`);
        } else if (i === journey.currentLevel) {
            nodeEl.classList.add('current');
            statusEl.textContent = 'Available';
            nodeEl.setAttribute('aria-label', `Level ${i}: Current level. Click to start.`);
        } else {
            nodeEl.classList.add('locked');
            statusEl.textContent = 'Locked';
            nodeEl.setAttribute('aria-label', `Level ${i}: Locked`);
        }
        
        elements.grid.appendChild(node);
    }

    const startBtnText = elements.startBtn.querySelector('span');
    startBtnText.textContent = `Start Level ${journey.currentLevel}`;
    elements.startBtn.dataset.level = journey.currentLevel;

    if (journey.currentLevel > journey.totalLevels) {
        startBtnText.textContent = `Journey Complete`;
        elements.startBtn.disabled = true;
    }
}

function handleInteraction(event) {
    const node = event.target.closest('.level-card, #start-level-btn');
    if (!node || node.classList.contains('locked')) return;

    const level = parseInt(node.dataset.level, 10);
    
    appState.context = {
        topic: journey.goal,
        level: level,
        journeyId: journey.id,
    };
    window.location.hash = '#/level';
}


export function init(globalState) {
    appState = globalState;
    const topic = appState.context.params.topic || appState.context.topic;

    if (!topic) {
        console.error("No topic found for game map, redirecting.");
        window.location.hash = '/topics';
        return;
    }
    
    // The topic might be URL encoded
    const decodedTopic = decodeURIComponent(topic);
    journey = learningPathService.startOrGetJourney(decodedTopic);

    elements = {
        title: document.getElementById('game-map-title'),
        progressFill: document.getElementById('progress-bar-fill'),
        progressText: document.getElementById('progress-percent-text'),
        grid: document.getElementById('levels-grid'),
        startBtn: document.getElementById('start-level-btn'),
    };

    render();
    
    elements.grid.addEventListener('click', handleInteraction);
    elements.startBtn.addEventListener('click', handleInteraction);
}

export function destroy() {
    // Event listeners on elements are cleaned up when the module is removed from DOM.
}