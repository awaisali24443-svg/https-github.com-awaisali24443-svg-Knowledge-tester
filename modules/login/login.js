// All navigation is handled by <a> tags with href attributes.
// This script is included for consistency and future logic implementation, such as form validation.
console.log("Login module loaded.");

const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        // In a real app, you'd prevent default and validate here.
        // For this demo, we just let the href handle navigation.
        console.log("Simulating login...");
    });
}