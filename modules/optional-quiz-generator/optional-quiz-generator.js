let form;
const formSubmitHandler = (e) => {
    e.preventDefault();
    const input = document.getElementById('topic-input');
    const topic = input.value.trim();
    if (topic) {
        // Set the topic via appState setter to save to session
        e.target.appState.context = { topic }; 
        window.location.hash = '#loading';
    } else {
        input.classList.add('invalid');
        setTimeout(() => {
            input.classList.remove('invalid');
        }, 2000);
    }
};

export function init(appState) {
    form = document.getElementById('quiz-generator-form');
    if (form) {
        form.appState = appState; // Attach appState to form for the handler
        form.addEventListener('submit', formSubmitHandler);
    }
}

export function destroy() {
    // FIX #26: Properly remove the event listener on cleanup.
    if (form) {
        form.removeEventListener('submit', formSubmitHandler);
    }
    console.log("Quiz Generator module destroyed.");
}