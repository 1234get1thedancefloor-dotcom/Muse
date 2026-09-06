const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    eventDate: { type: String, required: true }, // Stored as 'MM-DD' for recurring events or 'YYYY-MM-DD'
    eventName: { type: String, required: true },  // e.g., "My Anniversary", "Priya's Birthday"
    eventType: {
        type: String,
        enum: ['Birthday', 'Anniversary', 'Festival', 'Custom'],
        default: 'Custom'
    },
    chosenVibe: { type: String, required: true }, // e.g., "Velvet Chic", "Minimalist"
    outfitItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }]
});

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);
