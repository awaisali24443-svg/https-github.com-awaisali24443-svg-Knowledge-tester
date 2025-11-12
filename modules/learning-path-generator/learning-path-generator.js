
import { saveNewPath, getAllLearningPaths } from '../../services/learningPathService.js';
import { generateLearningPath } from '../../services/geminiService.js';
import { toastService } from '../../services/toastService.js';
import { initializeCardGlow } from '../../global/global.js';

let elements = {};

async function handleFormSubmit(e) {
    e.preventDefault();
    const goal = elements.input.value.trim();

    if (!goal) {
        toastService.show("Please enter a learning goal.");
        return;
    }

    setLoading(true);

    try {
        const data = await generateLearningPath(goal);
        if (!data.path || data.path.length === 0) {
            throw new Error("The AI was unable to generate a valid path for this topic. Please try being more specific.");
        }
        const newPath = saveNewPath({ name: goal, steps: data.path });
        
        window.location.hash = `learning-path/${newPath.id}`;

    } catch (error) {
        console.error("Path generation failed:", error);
        elements.errorContainer.textContent = error.message || "An unknown error occurred while generating the path.";
        elements.errorContainer.style.display = 'block';
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    if (isLoading) {
        elements.button.disabled = true;
        elements.btnText.style.display = 'none';
        elements.loader.style.display = 'inline-block';
        elements.errorContainer.style.display = 'none';
    } else {
        elements.button.disabled = false;
        elements.btnText.style.display = 'inline-block';
        elements.loader.style.display = 'none';
    }
}

function renderSavedPaths() {
    const savedPaths = getAllLearningPaths();
    
    if (!elements.savedPathsList) return;

    if (savedPaths.length > 0) {
        elements.savedPathsList.innerHTML = savedPaths.map(path => `
            <a href="#learning-path/${path.id}" class="saved-path-item card">
                <h3>${path.name}</h3>
                <p>${path.steps.length} steps</p>
            </a>
        `).join('');
        initializeCardGlow();
    } else {
        elements.savedPathsList.innerHTML = `<p class="card" style="text-align: center; color: var(--color-text-muted);">You haven't generated any learning paths yet.</p>`;
    }
}

export function init() {
    const form = document.getElementById('path-generator-form');
    elements = {
        form,
        input: document.getElementById('goal-input'),
        button: form.querySelector('button[type="submit"]'),
        btnText: form.querySelector('.btn-text'),
        loader: form.querySelector('.loader'),
        errorContainer: document.getElementById('path-error-container'),
        savedPathsList: document.getElementById('saved-paths-list'),
    };
    
    elements.form?.addEventListener('submit', handleFormSubmit);

    renderSavedPaths();
}

export function destroy() {
    elements.form?.removeEventListener('submit', handleFormSubmit);
    elements = {};
}
