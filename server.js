const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '.')));

// Handle SPA routing by sending all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
