const mongoose = require('mongoose');

const ClothingItemSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    imageLocalPathOrUrl: { type: String, required: true },
    category: { type: String, required: true }, // "Top", "Bottom", "Dress", "Shoes", "Jewelry", "Outerwear"
    name: { type: String },
    color: { type: String },
    material: { type: String }, // "Silk", "Cotton", "Leather", "Satin", etc.
    pattern: { type: String }, // "Solid", "Floral", "Striped", etc.
    style: { type: String }, // "Soft Coquette", "Minimalist", "Chic", "Goth", etc.
    formality: { type: Number, min: 1, max: 10, default: 5 }, // 1 (Ultra Casual) to 10 (Black Tie / Gala)
    detectedVibe: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClothingItem', ClothingItemSchema);
