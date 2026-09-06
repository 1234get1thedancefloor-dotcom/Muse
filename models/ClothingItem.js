const mongoose = require('mongoose');

const ClothingItemSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    imageLocalPathOrUrl: { type: String, required: true },
    category: { type: String, required: true }, // "Top", "Bottom", "Shoes", "Jewelry"
    detectedVibe: { type: String, required: true }, // "Chic", "Goth", "Indie"
    color: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClothingItem', ClothingItemSchema);
