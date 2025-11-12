let form, appStateRef;

const formSubmitHandler = (e) => {
    e.preventDefault();
    const input = document.getElementById('topic-input');
    const topic = input.value.trim();
    if (topic) {
        // Set the topic via appState setter to save to session
        appStateRef.context = { topic }; 
        window.location.hash = '#loading';
    } else {
        input.classList.add('invalid');
        setTimeout(() => {
            input.classList.remove('invalid');
        }, 500); // Shortened duration
    }
};

export function init(appState) {
    appStateRef = appState;
    form = document.getElementById('quiz-generator-form');
    if (form) {
        form.addEventListener('submit', formSubmitHandler);
    }
}

export function destroy() {
    if (form) {
        form.removeEventListener('submit', formSubmitHandler);
    }
    appStateRef = null;
    console.log("Quiz Generator module destroyed.");
}
