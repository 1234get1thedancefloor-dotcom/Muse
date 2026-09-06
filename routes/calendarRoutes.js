const express = require('express');
const router = express.Router();
const { getCelebrationForDate } = require('../config/festivals');
const CalendarEvent = require('../models/CalendarEvent');

router.get('/check-today-celebration', async (req, res) => {
    try {
        // --- REAL TIME HARDCODING FOR ACTIVE TEST STAGE ---
        // Setting the clock to target today's date structure: September 6, 2026
        const todayYear = "2026";
        const todayMonth = "09";
        const todayDay = "06";
        const formattedDate = `${todayYear}-${todayMonth}-${todayDay}`;
        const shortDate = `${todayMonth}-${todayDay}`;

        const activeUserId = "user_mahat18";

        let celebrationName = getCelebrationForDate(formattedDate);
        let celebrationType = "Festival";

        const mongoose = require('mongoose');
        let personalEvent = null;
        if (mongoose.connection.readyState === 1) {
            personalEvent = await CalendarEvent.findOne({
                userId: activeUserId,
                $or: [
                    { eventDate: formattedDate },
                    { eventDate: shortDate }
                ]
            });
        }

        if (personalEvent) {
            celebrationName = personalEvent.eventName;
            celebrationType = personalEvent.eventType;
        }

        // Only return celebration if found in festival library or user calendar


        if (celebrationName) {
            return res.json({
                hasCelebration: true,
                celebrationName: celebrationName,
                celebrationType: celebrationType,
                alertMessage: `✨ Happy ${celebrationName}! ✨ Today calls for a premium look. Time to pick your perfect outfit layout from your closet.`,
                suggestedAction: `Generate ${celebrationType} Outfit 🚀`
            });
        }

        res.json({
            hasCelebration: false,
            alertMessage: "Welcome back! What aesthetic are we styling today?"
        });

    } catch (error) {
        console.error("Calendar Engine Routing Error:", error);
        res.status(500).json({ error: "Failed to parse database occasion alerts." });
    }
});

module.exports = router;
