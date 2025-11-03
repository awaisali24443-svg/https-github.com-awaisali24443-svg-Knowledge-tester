console.log("Programming Quiz module loaded.");

document.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => {
        const topic = card.dataset.topic;
        if (topic) {
            sessionStorage.setItem('quizTopic', topic);
            window.location.hash = '#loading';
        }
    });
});