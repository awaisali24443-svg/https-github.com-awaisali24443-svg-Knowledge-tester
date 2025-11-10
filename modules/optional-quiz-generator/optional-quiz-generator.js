export function init(appState) {
    const form = document.getElementById('quiz-generator-form');
    const input = document.getElementById('topic-input');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const topic = input.value.trim();
            if (topic) {
                // Set the topic in the shared context for the loading module to pick up
                appState.context = { topic };
                // Navigate to the loading screen
                window.location.hash = '#loading';
            } else {
                // Simple validation feedback
                input.style.borderColor = 'var(--color-danger)';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 2000);
            }
        });
    }
}

export function destroy() {
    // No complex cleanup needed for this module
    console.log("Quiz Generator module destroyed.");
}