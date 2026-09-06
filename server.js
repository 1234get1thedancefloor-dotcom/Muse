require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const path = require('path');
const app = express();
const PORT = 5000;

// Enable CORS middleware so your app interface can talk to the server safely
app.use(cors());

// Enable incoming body payload parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend index.html automatically when you visit http://localhost:5000
app.use(express.static(__dirname));

// Import your custom Hugging Face AI routing file
const aiRouter = require('./routes/aiRoutes');
app.use('/api/ai', aiRouter);

// Fallback base route to launch index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening for app requests
app.listen(PORT, () => {
    console.log(`🚀 Muse backend server is running on http://localhost:${PORT}`);
});
