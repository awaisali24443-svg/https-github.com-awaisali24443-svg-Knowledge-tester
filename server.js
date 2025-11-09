const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// Dynamically generate a configuration script to pass environment variables to the frontend
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.process = {
      env: {
        API_KEY: '${process.env.API_KEY}',
        FIREBASE_CONFIG: {
          apiKey: '${process.env.FIREBASE_API_KEY}',
          authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',
          projectId: '${process.env.FIREBASE_PROJECT_ID}',
          storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',
          messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID}',
          appId: '${process.env.FIREBASE_APP_ID}'
        }
      }
    };
  `);
});

// Add route for PWA icon
app.get('/icon.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='#1f1f1f'/><text x='50' y='65' font-family='Inter, sans-serif' font-size='50' font-weight='800' fill='#2dd4bf' text-anchor='middle'>KT</text></svg>`);
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '.')));

// Handle SPA routing by sending all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});