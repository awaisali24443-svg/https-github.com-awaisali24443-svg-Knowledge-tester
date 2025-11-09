// This file initializes the Firebase SDK with the configuration provided by the server
// firebase-config.js

if (window.process && window.process.env.FIREBASE_CONFIG) {
  firebase.initializeApp(window.process.env.FIREBASE_CONFIG);
  console.log("Firebase initialized successfully.");
} else {
  console.error("Firebase configuration not found. Make sure config.js is loaded and environment variables are set.");
}
