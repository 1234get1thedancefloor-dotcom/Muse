require('dotenv').config(); 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');


// Hugging Face OpenAI-compatible Chat Completions router endpoint
const MODEL_URL = "https://router.huggingface.co/hf-inference/v1/chat/completions";
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// Configure multer with a 15MB limit and image storage
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 15 * 1024 * 1024 }
});

// The upload.single('outfitImage') middleware processes the file upload automatically
router.post('/detect-aesthetic', upload.single('outfitImage'), async (req, res) => {
    let tempFilePath = null;
    try {
        const { hasQuestion, userQuestion, demoMode } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: "No image file uploaded. Please select a JPG or PNG image." });
        }

        tempFilePath = req.file.path;

// Intelligent Fashion Question Responder
function answerUserFashionQuestion(question, vibe) {
    if (!question || question.trim() === "") return "";
    const q = question.toLowerCase();
    const answers = [];

    // 1. New Year's / Celebrations / Parties / Night Out
    if (q.includes("new year") || q.includes("nye") || q.includes("party") || q.includes("celebrat") || q.includes("night out") || q.includes("club") || q.includes("festival")) {
        answers.push(
            "🎉 New Year's & Celebration Match:\n" +
            "Yes! This outfit has great foundation for a New Year's Eve or party celebration. NYE thrives on high-energy glamour and light-catching details. To make this party-ready:\n" +
            "• Add Festive Shine: Introduce reflective metallic textures—such as a metallic mini-bag, sequined clutch, or crystal hair clips to catch the ambient party lights.\n" +
            "• Layering: Throw on a plush cropped faux-fur jacket or an oversized tailored blazer for that effortless party entrance.\n" +
            "• Footwear: Elevate with strappy metallic heels or sleek pointed-toe boots."
        );
    }

    // 2. Wedding / Traditional / Ethnic Celebrations (Diwali, Onam, Eid, Weddings)
    if (q.includes("wedding") || q.includes("diwali") || q.includes("onam") || q.includes("eid") || q.includes("puja") || q.includes("pooja") || q.includes("ethnic") || q.includes("traditional")) {
        answers.push(
            "✨ Festive & Wedding Occasion Match:\n" +
            "This silhouette can be styled beautifully for festive events! For traditional or wedding celebrations:\n" +
            "• Jewelry: Statement jhumkas, a kundan choker, or pearl-strung accents will instantly give it royal charm.\n" +
            "• Footwear: Embellished juttis, metallic block heels, or embroidered mules.\n" +
            "• Finishing Touch: Pair with a rich contrast silk stole or an embellished potli bag."
        );
    }

    // 3. Gold vs. Silver Jewelry Verdict
    if ((q.includes("gold") && q.includes("silver")) || q.includes("gold or silver") || q.includes("silver or gold")) {
        const pickGold = vibe.palette.includes("gold") || vibe.palette.includes("pink") || vibe.palette.includes("rose") || vibe.palette.includes("beige") || vibe.palette.includes("warm");
        const recommendedMetal = pickGold ? "Gold" : "Silver";
        const altMetal = pickGold ? "Silver" : "Gold";

        answers.push(
            `✨ Gold vs. Silver Jewelry Verdict:\n` +
            `For this specific outfit aesthetic, **${recommendedMetal}** is the winning choice!\n` +
            `• Why ${recommendedMetal}: It harmonizes naturally with the undertones of ${vibe.palette.toLowerCase()}, giving a warm, radiant, and seamless glow.\n` +
            `• When to choose ${altMetal}: Choose ${altMetal} if you prefer a sharper, cooler Y2K contrast or if your handbag/shoes feature chrome metallic hardware.\n` +
            `• Top Pieces: ${vibe.jewelry}.`
        );
    } 
    // 4. Jewelry & Accessories in General (if not specifically comparing gold vs silver)
    else if (q.includes("jewerly") || q.includes("jewelry") || q.includes("jewellery") || q.includes("accessory") || q.includes("accessories") || q.includes("necklace") || q.includes("earring") || q.includes("ring")) {
        answers.push(
            `💎 Jewelry & Accessory Advice:\n` +
            `• Best Match: ${vibe.jewelry}.\n` +
            `• Pro Styling Tip: If your neckline is scoop or open, go for a fine layered pendant; if the neckline has high collars or ruffles, skip the necklace and let statement earrings take center stage.`
        );
    }

    // 5. Shoes & Footwear
    if (q.includes("shoe") || q.includes("shoes") || q.includes("heel") || q.includes("heels") || q.includes("sneaker") || q.includes("sneakers") || q.includes("boot") || q.includes("boots") || q.includes("flat") || q.includes("sandals")) {
        answers.push(
            `👠 Footwear Recommendation:\n` +
            `• Best Choice: ${vibe.shoes}.\n` +
            `• Casual / Walkable: Clean low-profile sneakers or ballet flats keep the silhouette relaxed and breezy.\n` +
            `• Evening / Elevated: Pointed-toe kitten heels or strappy slingbacks elongate the legs and elevate the overall posture.`
        );
    }

    // 6. Jackets, Outerwear & Layering
    if (q.includes("jacket") || q.includes("coat") || q.includes("blazer") || q.includes("cardigan") || q.includes("layer") || q.includes("winter") || q.includes("cold")) {
        answers.push(
            "🧥 Layering & Outerwear Guide:\n" +
            "• Recommended Layer: An oversized tailored blazer, cropped boxy jacket, or structured trench.\n" +
            "• Proportion Rule: Avoid mid-hip jackets—keep the outer layer either cropped right at your natural waist or go for an intentional longline silhouette past the knee."
        );
    }

    // 7. Hair & Makeup
    if (q.includes("makeup") || q.includes("hair") || q.includes("lipstick") || q.includes("lip") || q.includes("eyeshadow") || q.includes("beauty")) {
        answers.push(
            `💄 Hair & Beauty Direction:\n` +
            `• Makeup Touch: ${vibe.beauty}.\n` +
            `• Hair Suggestion: A relaxed French-pin twist, soft face-framing curtain bangs, or sleek low bun to showcase your collarbones and jewelry.`
        );
    }

    // 8. Color Harmony & "Does this match" (if not already answered)
    if (answers.length === 0 && (q.includes("match") || q.includes("color") || q.includes("colour") || q.includes("look good") || q.includes("go with"))) {
        answers.push(
            `🎨 Color & Silhouette Balance:\n` +
            `Yes! The aesthetic harmony is on point. This look leans into ${vibe.archetype}.\n` +
            `• Palette Anchor: ${vibe.palette}.\n` +
            `• Styling Rule: Follow the 3-color rule—stick to 2-3 core tones so pieces don't clash, then use one accent accessory to tie everything together.`
        );
    }

    // 9. Personalized Fallback for any other custom question
    if (answers.length === 0) {
        answers.push(
            `✨ Stylist Advice on "${question}":\n` +
            `• Verdict: This combination works smoothly! The outfit leans beautifully into ${vibe.archetype}.\n` +
            `• Key Tip: Keep the focus balanced by pairing with ${vibe.jewelry.toLowerCase()} and ${vibe.shoes.toLowerCase()}.`
        );
    }

    return answers.join("\n\n");
}

        // Instant demo mode for UI testing and mock styling
        if (demoMode === 'true' || demoMode === true) {
            const vibes = [
                {
                    archetype: "Soft Coquette & Modern Romantic 💕",
                    palette: "Powder pink, cream ivory, and rose gold",
                    mood: "Whimsical, feminine, and effortlessly elevated",
                    shoes: "Kitten heels, dainty ballet flats, or Mary Janes",
                    jewelry: "Dainty pearl drop earrings or fine gold layering chains",
                    beauty: "Dewy cushion blush, glazed lip oil, and soft winged lashes"
                },
                {
                    archetype: "90s Minimalist & Clean Chic ✨",
                    palette: "Oatmeal beige, slate gray, and espresso black",
                    mood: "Understated, structured, and confident",
                    shoes: "Sleek pointed slingbacks or lug-sole loafers",
                    jewelry: "Chunky silver huggies and a sculptural cuff bracelet",
                    beauty: "Satin nude lip, clean-girl brushed brows, and minimal mascara"
                },
                {
                    archetype: "Y2K Indie Pop & Playful Retro 🌈",
                    palette: "Baby blue, metallic chrome, and cherry red",
                    mood: "Vibrant, nostalgic, and trendsetter energy",
                    shoes: "Platform sneakers or retro square-toe ankle boots",
                    jewelry: "Layered silver ball chains and star-charm rings",
                    beauty: "Glossy berry tint and frosted champagne highlighter"
                }
            ];
            const pick = vibes[Math.floor(Math.random() * vibes.length)];

            let demoResponse;
            if (hasQuestion === "true" && userQuestion && userQuestion.trim() !== "") {
                const detailedAnswer = answerUserFashionQuestion(userQuestion, pick);
                demoResponse = `✨ Muse Stylist Consultation\n\n🎯 Your Question: "${userQuestion}"\n\n${detailedAnswer}\n\n━━━━━━━━━━━━━━━━━━━━━\n👗 Outfit Vibe Breakdown:\n• Vibe Archetype: ${pick.archetype}\n• Color Palette: ${pick.palette}\n• Recommended Footwear: ${pick.shoes}\n• Beauty & Makeup Touch: ${pick.beauty}`;
            } else {
                demoResponse = `✨ Aesthetic Breakdown:\n• Vibe Archetype: ${pick.archetype}\n• Color Palette: ${pick.palette}\n• Overall Mood: ${pick.mood}\n• Recommended Accessories: ${pick.jewelry}\n• Shoes to Pair: ${pick.shoes}\n• Beauty & Makeup Touch: ${pick.beauty}`;
            }

            return res.json({
                success: true,
                isDemo: true,
                text: demoResponse,
                results: { generated_text: demoResponse }
            });
        }

        // Convert local temporary physical image file into base64 string
        const imageBuffer = fs.readFileSync(tempFilePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';

        // Set prompt instructions dynamically
        let finalPrompt;
        if (hasQuestion === "true" && userQuestion && userQuestion.trim() !== "") {
            finalPrompt = `Analyze the outfit in this image and answer this specific question: "${userQuestion}"`;
        } else {
            finalPrompt = "Analyze the outfit in this image. Describe its general fashion vibe, aesthetic style (e.g., Goth, Chic, Y2K, Minimalist, Coquette, Indie), and overall mood in a few clean, engaging sentences.";
        }

        // Build payload configuration matching the OpenAI-compatible multimodal architecture
        const payload = {
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: finalPrompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 350
        };

        if (!process.env.HF_API_KEY || process.env.HF_API_KEY.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "HF_API_KEY is missing in your .env file! Please add your Hugging Face API key."
            });
        }

        // Query Hugging Face serverless router
        const hfResponse = await fetch(MODEL_URL, {
            headers: { 
                "Authorization": `Bearer ${process.env.HF_API_KEY.trim()}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(payload),
        });

        const responseText = await hfResponse.text();
        let rawData;

        try {
            rawData = JSON.parse(responseText);
        } catch (e) {
            console.error("Non-JSON response from Hugging Face:", responseText.substring(0, 300));
            return res.status(502).json({
                success: false,
                error: "Hugging Face returned an invalid response. The model may be starting up or under heavy load.",
                raw: responseText.substring(0, 300)
            });
        }

        // Check for Hugging Face error responses
        if (!hfResponse.ok) {
            console.warn(`Hugging Face API Error (${hfResponse.status}):`, rawData);

            let message = rawData.error || `Hugging Face returned HTTP ${hfResponse.status}`;
            if (typeof message === 'object' && message.message) message = message.message;

            // Give user-friendly guidance for permission errors
            if (hfResponse.status === 403 && typeof message === 'string' && message.includes("Inference Providers")) {
                return res.status(403).json({
                    success: false,
                    error: "Hugging Face Token Permission Error: Your Hugging Face token lacks permission to call Inference Providers. In huggingface.co/settings/tokens, either check 'Make calls to Inference Providers' on your token or create a Classic 'Read' token.",
                    raw: rawData
                });
            }

            return res.status(hfResponse.status).json({
                success: false,
                error: message,
                raw: rawData
            });
        }

        // Safely extract the text from various Hugging Face response formats
        let extractedText = "";
        if (rawData.choices && rawData.choices[0] && rawData.choices[0].message) {
            extractedText = rawData.choices[0].message.content;
        } else if (Array.isArray(rawData) && rawData[0] && rawData[0].generated_text) {
            extractedText = rawData[0].generated_text;
        } else if (rawData.generated_text) {
            extractedText = rawData.generated_text;
        } else if (typeof rawData === 'string') {
            extractedText = rawData;
        } else {
            extractedText = JSON.stringify(rawData, null, 2);
        }

        res.json({
            success: true,
            results: rawData,
            text: extractedText
        });

    } catch (error) {
        console.error("AI Routing Error:", error);
        res.status(500).json({ 
            success: false,
            error: error.message || "Failed to process image aesthetic." 
        });
    } finally {
        // Safe cleanup: always delete the temporary uploaded file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (err) {
                console.error("Failed to delete temp file:", err);
            }
        }
    }
});

// AI Outfit Generator from User's Digital Wardrobe
router.post('/generate-outfit', async (req, res) => {
    try {
        const { wardrobe, vibe = "Soft Coquette", occasion = "Party" } = req.body;

        const clothes = (wardrobe && Array.isArray(wardrobe.clothes)) ? wardrobe.clothes : [];
        const shoes = (wardrobe && Array.isArray(wardrobe.shoes)) ? wardrobe.shoes : [];
        const jewelry = (wardrobe && Array.isArray(wardrobe.jewelry)) ? wardrobe.jewelry : [];

        if (clothes.length === 0 && shoes.length === 0 && jewelry.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Your digital wardrobe is empty! Please upload at least one piece of clothing, shoes, or jewelry."
            });
        }

        // Match items intelligently based on occasion and vibe
        const isEthnicOccasion = ["Diwali", "Onam", "Wedding Reception", "Puja", "Traditional"].includes(occasion) || vibe.includes("Desi");
        const isNYEorParty = ["New Year's Eve", "Party", "Cocktail Party", "Birthday Bash"].includes(occasion);

        // Filter or pick best match clothing item
        let selectedClothes = [];
        const ethnicClothes = clothes.filter(c => (c.tags || []).some(t => ["ethnic", "traditional", "kurta", "saree", "lehenga", "anarkali"].includes(t.toLowerCase())) || (c.name || "").toLowerCase().match(/saree|kurta|lehenga|anarkali|silk/));
        const westernPartyClothes = clothes.filter(c => (c.tags || []).some(t => ["party", "glam", "dress", "slip", "velvet", "satin"].includes(t.toLowerCase())) || (c.name || "").toLowerCase().match(/dress|slip|skirt|blazer|corset/));

        if (isEthnicOccasion && ethnicClothes.length > 0) {
            selectedClothes.push(ethnicClothes[Math.floor(Math.random() * ethnicClothes.length)]);
        } else if (isNYEorParty && westernPartyClothes.length > 0) {
            selectedClothes.push(westernPartyClothes[Math.floor(Math.random() * westernPartyClothes.length)]);
        } else if (clothes.length > 0) {
            selectedClothes.push(clothes[Math.floor(Math.random() * clothes.length)]);
        }

        // Pick shoes
        let selectedShoes = null;
        const ethnicShoes = shoes.filter(s => (s.tags || []).some(t => ["jutti", "kolhapuri", "traditional"].includes(t.toLowerCase())) || (s.name || "").toLowerCase().match(/jutti|kolhapuri|mule/));
        const partyShoes = shoes.filter(s => (s.tags || []).some(t => ["heel", "metallic", "strappy", "boot"].includes(t.toLowerCase())) || (s.name || "").toLowerCase().match(/heel|slingback|boot/));

        if (isEthnicOccasion && ethnicShoes.length > 0) {
            selectedShoes = ethnicShoes[Math.floor(Math.random() * ethnicShoes.length)];
        } else if (isNYEorParty && partyShoes.length > 0) {
            selectedShoes = partyShoes[Math.floor(Math.random() * partyShoes.length)];
        } else if (shoes.length > 0) {
            selectedShoes = shoes[Math.floor(Math.random() * shoes.length)];
        }

        // Pick jewelry / accessories
        let selectedJewelry = [];
        const ethnicJewelry = jewelry.filter(j => (j.tags || []).some(t => ["jhumka", "kundan", "traditional", "gold", "bangle"].includes(t.toLowerCase())) || (j.name || "").toLowerCase().match(/jhumka|kundan|bangle|choker/));
        const glamJewelry = jewelry.filter(j => (j.tags || []).some(t => ["pearl", "crystal", "silver", "rhinestone", "clutch"].includes(t.toLowerCase())) || (j.name || "").toLowerCase().match(/pearl|clutch|chain|baguette/));

        if (isEthnicOccasion && ethnicJewelry.length > 0) {
            selectedJewelry.push(ethnicJewelry[Math.floor(Math.random() * ethnicJewelry.length)]);
        } else if (isNYEorParty && glamJewelry.length > 0) {
            selectedJewelry.push(glamJewelry[Math.floor(Math.random() * glamJewelry.length)]);
        } else if (jewelry.length > 0) {
            selectedJewelry.push(jewelry[Math.floor(Math.random() * jewelry.length)]);
        }

        // If another distinct jewelry piece is available, add it
        const remainingJewelry = jewelry.filter(j => !selectedJewelry.includes(j));
        if (remainingJewelry.length > 0 && Math.random() > 0.4) {
            selectedJewelry.push(remainingJewelry[Math.floor(Math.random() * remainingJewelry.length)]);
        }

        // Generate tailored styling commentary
        const clothesName = selectedClothes[0] ? selectedClothes[0].name : "your signature base";
        const shoesName = selectedShoes ? selectedShoes.name : "sleek footwear";
        const jewelryNames = selectedJewelry.map(j => j.name).join(" and ") || "minimalist accents";

        let occasionNote = "";
        let beautyTip = "";

        if (occasion === "Diwali") {
            occasionNote = `For Diwali festivities, this look captures the warmth of ambient diyas with regal poise. Pairing ${clothesName} with ${shoesName} allows you to move effortlessly between family pujas and festive card parties.`;
            beautyTip = "Smudged kohl eyes, luminous warm golden highlighter, and a soft berry or terracotta lip.";
        } else if (occasion === "Onam") {
            occasionNote = `For Onam celebrations, this outfit radiates grace and tradition. The clean lines of ${clothesName} complemented by ${jewelryNames} create a timeless festive statement.`;
            beautyTip = "Fresh jasmine (gajra) in a sleek braided bun, winged liner, and a dewy matte lip.";
        } else if (occasion === "New Year's Eve") {
            occasionNote = `For NYE, high-energy party glamour is key. Combining ${clothesName} with ${jewelryNames} catches room lighting dynamically as the countdown approaches.`;
            beautyTip = "Frosted champagne eyeshadow, glazed glass-skin cheeks, and a bold long-wear lip.";
        } else if (occasion === "Birthday Bash") {
            occasionNote = `You're the center of attention! Styling ${clothesName} with ${shoesName} ensures you look effortlessly striking from cocktail hour to dancing.`;
            beautyTip = "Lash extensions or winged mascara, glossy pink tint, and tousled blowout waves.";
        } else {
            occasionNote = `For this ${occasion}, balancing ${vibe} elements ensures you look intentionally styled without feeling overdressed.`;
            beautyTip = "Effortless clean-girl dewy blush, groomed brows, and hydrating lip oil.";
        }

        const outfit = {
            id: 'outfit_' + Date.now(),
            title: `${vibe} × ${occasion} Edit`,
            occasion: occasion,
            vibe: vibe,
            items: {
                clothes: selectedClothes,
                shoes: selectedShoes ? [selectedShoes] : [],
                jewelry: selectedJewelry
            },
            stylingRationale: occasionNote,
            beautyTip: beautyTip,
            colorPalette: `Harmonious tones anchored around ${selectedClothes[0] ? selectedClothes[0].color || 'core neutrals' : 'your wardrobe staples'}`,
            generatedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            outfit: outfit
        });

    } catch (error) {
        console.error("Outfit generation error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate outfit from wardrobe items."
        });
    }
});

module.exports = router;

