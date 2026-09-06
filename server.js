require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Mount Feature Routers
const aiRouter = require('./routes/aiRoutes');
const calendarRouter = require('./routes/calendarRoutes');

app.use('/api/ai', aiRouter);
app.use('/api/calendar', calendarRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(
        `Muse backend server running cleanly on http://localhost:${PORT}`
    );
});