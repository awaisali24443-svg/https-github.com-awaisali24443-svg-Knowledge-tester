// signup.js - Logic for the signup module

const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await window.showConfirmationModal({
            title: 'Feature In Development',
            text: 'Signup functionality is not yet implemented. You will be logged in as a guest.',
            confirmText: 'Continue',
            isAlert: true
        });
        // Redirect to home after modal confirmation, creating a consistent "demo" flow
        window.location.hash = '#home';
    });
}