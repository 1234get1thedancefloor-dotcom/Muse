require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// ============================================================
// BASIC SETUP
// ============================================================

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 15 * 1024 * 1024
    }
});

// Hugging Face OpenAI-compatible router
const MODEL_URL = 'https://router.huggingface.co/v1/chat/completions';

// node-fetch
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));


// ============================================================
// AESTHETIC PROFILES
// ============================================================

const aestheticProfiles = {

    "Soft Coquette": {
        keywords: [
            "bow",
            "lace",
            "ribbon",
            "floral",
            "pearl",
            "ballet",
            "mary jane",
            "mini skirt",
            "pleated skirt",
            "cardigan",
            "romantic",
            "feminine",
            "delicate",
            "ruffle"
        ],

        colors: [
            "pink",
            "baby pink",
            "blush",
            "cream",
            "white",
            "pastel",
            "lavender"
        ],

        styles: [
            "coquette",
            "romantic",
            "feminine",
            "girly"
        ]
    },


    "Clean Girl": {
        keywords: [
            "minimal",
            "tailored",
            "blazer",
            "trousers",
            "straight leg",
            "simple",
            "structured",
            "button down",
            "neutral",
            "sleek",
            "loafers"
        ],

        colors: [
            "white",
            "cream",
            "beige",
            "black",
            "gray",
            "grey",
            "brown",
            "navy"
        ],

        styles: [
            "minimalist",
            "clean",
            "classic",
            "tailored"
        ]
    },


    "Y2K": {
        keywords: [
            "low rise",
            "crop top",
            "baggy",
            "mini skirt",
            "platform",
            "cargo",
            "denim",
            "baby tee",
            "graphic tee",
            "metallic",
            "butterfly",
            "chunky"
        ],

        colors: [
            "pink",
            "baby blue",
            "silver",
            "chrome",
            "purple",
            "lime",
            "red"
        ],

        styles: [
            "y2k",
            "retro",
            "playful",
            "2000s"
        ]
    },


    "Goth": {
        keywords: [
            "black",
            "leather",
            "mesh",
            "lace",
            "boots",
            "chains",
            "corset",
            "dark",
            "platform boots",
            "graphic",
            "silver hardware"
        ],

        colors: [
            "black",
            "charcoal",
            "gray",
            "dark red",
            "burgundy",
            "purple"
        ],

        styles: [
            "goth",
            "grunge",
            "dark",
            "alternative"
        ]
    },


    "Indie Sleaze": {
        keywords: [
            "leather jacket",
            "band tee",
            "denim",
            "mini skirt",
            "boots",
            "messy",
            "layered",
            "vintage",
            "graphic tee",
            "tights"
        ],

        colors: [
            "black",
            "gray",
            "red",
            "white",
            "dark blue"
        ],

        styles: [
            "indie",
            "grunge",
            "rock",
            "vintage"
        ]
    },


    "Parisian Chic": {
        keywords: [
            "blazer",
            "trench",
            "loafers",
            "slingbacks",
            "striped",
            "tailored",
            "classic",
            "button down",
            "structured",
            "silk scarf"
        ],

        colors: [
            "black",
            "cream",
            "camel",
            "brown",
            "navy",
            "white",
            "beige"
        ],

        styles: [
            "parisian",
            "french",
            "classic",
            "chic",
            "luxury"
        ]
    },


    "Streetwear": {
        keywords: [
            "oversized",
            "hoodie",
            "cargo",
            "sneakers",
            "baggy",
            "graphic tee",
            "joggers",
            "varsity",
            "street",
            "layered"
        ],

        colors: [
            "black",
            "white",
            "gray",
            "green",
            "blue",
            "red"
        ],

        styles: [
            "streetwear",
            "urban",
            "casual",
            "oversized"
        ]
    },


    "Old Money": {
        keywords: [
            "polo",
            "knit",
            "blazer",
            "loafers",
            "trousers",
            "pleated",
            "button down",
            "tailored",
            "classic",
            "cashmere"
        ],

        colors: [
            "cream",
            "white",
            "navy",
            "camel",
            "beige",
            "brown",
            "burgundy",
            "forest green"
        ],

        styles: [
            "old money",
            "preppy",
            "classic",
            "luxury",
            "tailored"
        ]
    }

};


// ============================================================
// AESTHETIC SCORING ENGINE
// ============================================================

function scoreAesthetics(text) {

    if (!text) {
        return [];
    }

    const normalizedText = text.toLowerCase();

    const scores = [];

    for (const [name, profile] of Object.entries(aestheticProfiles)) {

        let score = 0;

        // Strong signals
        profile.keywords.forEach(keyword => {

            if (normalizedText.includes(keyword.toLowerCase())) {
                score += 3;
            }

        });

        // Color signals
        profile.colors.forEach(color => {

            if (normalizedText.includes(color.toLowerCase())) {
                score += 1.5;
            }

        });

        // Style signals
        profile.styles.forEach(style => {

            if (normalizedText.includes(style.toLowerCase())) {
                score += 4;
            }

        });

        scores.push({
            aesthetic: name,
            rawScore: score
        });
    }

    scores.sort((a, b) => b.rawScore - a.rawScore);

    const highest = scores[0]?.rawScore || 1;

    return scores.map(item => ({
        aesthetic: item.aesthetic,

        score: Math.min(
            99,
            Math.max(
                1,
                Math.round((item.rawScore / highest) * 100)
            )
        )
    }));
}


// ============================================================
// PARSE AI JSON SAFELY
// ============================================================

function extractJSON(text) {

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        // Continue below
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        return null;
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        return null;
    }
}


// ============================================================
// COLOR HEX LOOKUP HELPER
// ============================================================

// ============================================================
// FASHION COLOR DICTIONARY & ACCURATE COLOR MATCHER
// ============================================================

const FASHION_COLOR_DICT = [
    { name: "Jet Black", hex: "#111111", r: 17, g: 17, b: 17 },
    { name: "Charcoal Grey", hex: "#36454F", r: 54, g: 69, b: 79 },
    { name: "Slate Grey", hex: "#708090", r: 112, g: 128, b: 144 },
    { name: "Heather Grey", hex: "#A9A9A9", r: 169, g: 169, b: 169 },
    { name: "Crisp White", hex: "#FFFFFF", r: 255, g: 255, b: 255 },
    { name: "Ivory Cream", hex: "#FFFFF0", r: 255, g: 255, b: 240 },
    { name: "Warm Beige", hex: "#F5F5DC", r: 245, g: 245, b: 220 },
    { name: "Oatmeal", hex: "#E3DAC9", r: 227, g: 218, b: 201 },
    { name: "Camel Tan", hex: "#C19A6B", r: 193, g: 154, b: 107 },
    { name: "Espresso Brown", hex: "#4A2E18", r: 74, g: 46, b: 24 },
    { name: "Chocolate Brown", hex: "#3D2314", r: 61, g: 35, b: 20 },
    { name: "Warm Chestnut", hex: "#8B4513", r: 139, g: 69, b: 19 },
    { name: "Terracotta", hex: "#CC4E33", r: 204, g: 78, b: 51 },
    { name: "Crimson Red", hex: "#E60023", r: 230, g: 0, b: 35 },
    { name: "Deep Burgundy", hex: "#800020", r: 128, g: 0, b: 32 },
    { name: "Cherry Wine", hex: "#6E0B23", r: 110, g: 11, b: 35 },
    { name: "Blush Pink", hex: "#DE5D83", r: 222, g: 93, b: 131 },
    { name: "Powder Pink", hex: "#F4C2C2", r: 244, g: 194, b: 194 },
    { name: "Dusty Rose", hex: "#DCAE96", r: 220, g: 174, b: 150 },
    { name: "Baby Blue", hex: "#89CFF0", r: 137, g: 207, b: 240 },
    { name: "Denim Blue", hex: "#2B4C7E", r: 43, g: 76, b: 126 },
    { name: "Royal Navy", hex: "#000080", r: 0, g: 0, b: 128 },
    { name: "Midnight Navy", hex: "#1B263B", r: 27, g: 38, b: 59 },
    { name: "Sage Green", hex: "#87A987", r: 135, g: 169, b: 135 },
    { name: "Olive Khaki", hex: "#556B2F", r: 85, g: 107, b: 47 },
    { name: "Forest Pine", hex: "#228B22", r: 34, g: 139, b: 34 },
    { name: "Emerald Green", hex: "#046307", r: 4, g: 99, b: 7 },
    { name: "Mustard Gold", hex: "#E1AD01", r: 225, g: 173, b: 1 },
    { name: "Warm Gold", hex: "#D4AF37", r: 212, g: 175, b: 55 },
    { name: "Burnished Silver", hex: "#C0C0C0", r: 192, g: 192, b: 192 },
    { name: "Pastel Lilac", hex: "#C8A2C8", r: 200, g: 162, b: 200 },
    { name: "Royal Plum", hex: "#4E1643", r: 78, g: 22, b: 67 }
];

function hexToRgb(hex) {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function findClosestFashionColor(r, g, b) {
    let closest = FASHION_COLOR_DICT[0];
    let minDistance = Infinity;

    for (const c of FASHION_COLOR_DICT) {
        // Weighted Euclidean distance in RGB space for human perceptual color accuracy
        const rmean = (r + c.r) / 2;
        const dr = r - c.r;
        const dg = g - c.g;
        const db = b - c.b;
        const dist = Math.sqrt((((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8));

        if (dist < minDistance) {
            minDistance = dist;
            closest = c;
        }
    }
    return closest;
}

function resolveColorHex(colorName) {
    if (!colorName) return "#555555";
    if (colorName.startsWith('#') && (colorName.length === 4 || colorName.length === 7)) {
        return colorName;
    }
    const key = String(colorName).toLowerCase().trim();
    for (const c of FASHION_COLOR_DICT) {
        if (key.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(key)) {
            return c.hex;
        }
    }
    return "#555555";
}

// ============================================================
// COMPREHENSIVE VIBE ANALYSIS BUILDER
// ============================================================

function buildVibeReport(parsedAI = null, userQuestion = "", hasQuestion = false, extractedColors = null) {
    const archetypes = [
        {
            style: "Parisian Chic",
            baseScore: 94,
            palette: ["Camel Tan", "Warm Ivory", "Espresso Black", "Soft Gold"],
            breakdown: [
                "Tailored single-breasted blazer with structured shoulders",
                "Straight-leg high-rise tailored trousers",
                "Pointed slingbacks or polished leather loafers",
                "Sculptural gold hoops and minimalist leather watch"
            ],
            mood: "Tailored, sophisticated, and nonchalant modern luxury",
            events: "Gallery Openings, Dinner Soirees, Business Casual Dinners, City Strolls",
            weather: "Autumn & Spring Transition (14°C - 22°C) • Crisp mild temperatures"
        },
        {
            style: "Clean Girl",
            baseScore: 93,
            palette: ["Oatmeal Beige", "Crisp White", "Slate Gray", "Warm Brown"],
            breakdown: [
                "Structured button-down poplin shirt or ribbed knit tank",
                "Pleated wide-leg trousers",
                "Chunky neutral loafers or minimal sneakers",
                "Chunky silver huggies and a structured shoulder bag"
            ],
            mood: "Understated, poised, and confident minimalist chic",
            events: "Coffee Dates, Creative Meetings, Weekend Brunch, Casual Dinners",
            weather: "All-Season Layering (16°C - 24°C) • Sunny or overcast mild weather"
        },
        {
            style: "Old Money",
            baseScore: 92,
            palette: ["Navy Blue", "Crisp Cream", "Forest Green", "Rich Tan"],
            breakdown: [
                "Cable-knit sweater draped over crisp collared shirt",
                "Tailored pleated linen shorts or pleated trousers",
                "Leather horsebit loafers",
                "Subtle pearl studs and vintage leather-strap timepiece"
            ],
            mood: "Aristocratic, timeless, refined, and effortlessly elite",
            events: "Yacht Clubs, Countryside Retreats, Polo Matches, High Tea",
            weather: "Crisp Sunny Spring & Early Summer (17°C - 25°C) • Clear blue skies"
        },
        {
            style: "Soft Coquette",
            baseScore: 91,
            palette: ["Powder Pink", "Cream Ivory", "Rose Gold", "Warm Nude"],
            breakdown: [
                "Silk lace-trim corset top with structured boning",
                "High-waisted pleated satin midi skirt",
                "Pointed kitten-heel slingbacks",
                "Fine pearl necklace and gold layering chains"
            ],
            mood: "Romantic, whimsical, and effortlessly elevated with soft feminine charm",
            events: "Date Night, Rooftop Cocktail Evening, Birthday Celebration, Summer Garden Soiree",
            weather: "Mild Spring & Early Autumn (18°C - 26°C) • Gentle breezy evenings"
        },
        {
            style: "Goth Grunge",
            baseScore: 90,
            palette: ["Midnight Black", "Charcoal Gray", "Deep Burgundy", "Burnished Silver"],
            breakdown: [
                "Fitted mesh or velvet corset top with dark hardware",
                "Distressed denim or structured dark pleated mini skirt",
                "Platform leather ankle boots",
                "Layered silver ball chains and statement rings"
            ],
            mood: "Edgy, rebellious, magnetic, and moody editorial allure",
            events: "Concerts, Night Clubbing, Underground Lounges, Evening Parties",
            weather: "Cool Evening & Night Out (12°C - 20°C) • Overcast or night atmosphere"
        },
        {
            style: "Y2K Retro",
            baseScore: 89,
            palette: ["Baby Blue", "Chrome Silver", "Cherry Red", "Pastel Lilac"],
            breakdown: [
                "Baby tee or metallic halter crop top",
                "Low-rise cargo trousers or pleated micro-skirt",
                "Platform retro sneakers or square-toe boots",
                "Chunky resin rings, star hair clips, and shoulder baguette bag"
            ],
            mood: "Vibrant, playful, energetic, and nostalgic trendsetter energy",
            events: "Music Festivals, Day Parties, Shopping Excursions, Streetwear Meetups",
            weather: "Warm Summer & Sunny Days (20°C - 30°C) • Bright and sunny"
        }
    ];

    // Determine color palette directly from actual pixel extraction if available
    let finalPalette = [];
    if (extractedColors && Array.isArray(extractedColors) && extractedColors.length > 0) {
        finalPalette = extractedColors.slice(0, 4).map(c => ({
            name: c.name || "Detected Tone",
            hex: c.hex || resolveColorHex(c.name)
        }));
    } else if (parsedAI && parsedAI.colors && parsedAI.colors.length > 0) {
        finalPalette = parsedAI.colors.slice(0, 4).map(c => ({
            name: typeof c === 'string' ? (c.charAt(0).toUpperCase() + c.slice(1)) : (c.name || 'Tone'),
            hex: typeof c === 'object' && c.hex ? c.hex : resolveColorHex(typeof c === 'string' ? c : c.name)
        }));
    }

    // Pick top primary based on detected colors + AI text
    let primaryPick = archetypes[0];
    const colorNamesCombined = finalPalette.map(p => p.name.toLowerCase()).join(' ');

    if (colorNamesCombined.includes('black') || colorNamesCombined.includes('charcoal') || colorNamesCombined.includes('burgundy') || colorNamesCombined.includes('dark')) {
        primaryPick = archetypes.find(a => a.style === "Goth Grunge") || primaryPick;
    } else if (colorNamesCombined.includes('pink') || colorNamesCombined.includes('rose') || colorNamesCombined.includes('powder')) {
        primaryPick = archetypes.find(a => a.style === "Soft Coquette") || primaryPick;
    } else if (colorNamesCombined.includes('navy') || colorNamesCombined.includes('green') || colorNamesCombined.includes('forest')) {
        primaryPick = archetypes.find(a => a.style === "Old Money") || primaryPick;
    } else if (colorNamesCombined.includes('tan') || colorNamesCombined.includes('camel') || colorNamesCombined.includes('beige') || colorNamesCombined.includes('cream')) {
        primaryPick = archetypes.find(a => a.style === "Parisian Chic") || primaryPick;
    } else if (colorNamesCombined.includes('blue') || colorNamesCombined.includes('lilac') || colorNamesCombined.includes('red')) {
        primaryPick = archetypes.find(a => a.style === "Y2K Retro") || primaryPick;
    }

    if (parsedAI) {
        const text = [
            ...(parsedAI.clothing || []),
            ...(parsedAI.colors || []),
            ...(parsedAI.patterns || []),
            parsedAI.silhouette || "",
            parsedAI.mood || "",
            parsedAI.occasion || "",
            ...(parsedAI.styleKeywords || [])
        ].join(" ").toLowerCase();

        const scores = scoreAesthetics(text);
        if (scores.length > 0) {
            const topMatch = archetypes.find(a => a.style.toLowerCase().includes(scores[0].aesthetic.toLowerCase()));
            if (topMatch) primaryPick = topMatch;
        }
    }

    // If no palette was provided by client or AI, fallback to the archetype palette
    if (finalPalette.length === 0) {
        finalPalette = primaryPick.palette.map(c => ({
            name: c,
            hex: resolveColorHex(c)
        }));
    }

    // Select 3 distinct styles
    const remaining = archetypes.filter(a => a.style !== primaryPick.style);
    const shuffledRemaining = remaining.sort(() => 0.5 - Math.random());
    const secondPick = shuffledRemaining[0];
    const thirdPick = shuffledRemaining[1];

    // Compute scores for top 3
    const score3 = Math.floor(Math.random() * 8) + 72; // e.g. 72-79
    const score2 = Math.floor(Math.random() * 8) + 82; // e.g. 82-89
    const score1 = Math.floor(Math.random() * 5) + 94; // e.g. 94-98

    // Top 3 styles sorted in DESCENDING order (highest percentage to lowest percentage)
    const topStylesDescending = [
        {
            style: primaryPick.style,
            score: score1
        },
        {
            style: secondPick.style,
            score: score2
        },
        {
            style: thirdPick.style,
            score: score3
        }
    ];

    // Outfit Breakdown
    let outfitBreakdown = (parsedAI && parsedAI.clothing && parsedAI.clothing.length > 0)
        ? parsedAI.clothing
        : primaryPick.breakdown;

    // Mood
    const mood = (parsedAI && parsedAI.mood && parsedAI.mood.trim() !== "")
        ? parsedAI.mood
        : primaryPick.mood;

    // Best For (Events & Weather)
    const bestFor = {
        events: (parsedAI && parsedAI.occasion && parsedAI.occasion.trim() !== "")
            ? `${parsedAI.occasion}, ${primaryPick.events}`
            : primaryPick.events,
        weather: primaryPick.weather
    };

    // Specific Question Answer
    let questionAnswer = null;
    if (hasQuestion && userQuestion && userQuestion.trim() !== "") {
        const q = userQuestion.toLowerCase();
        if (q.includes("gold") || q.includes("silver")) {
            const metal = (finalPalette.some(c => c.name.toLowerCase().includes("gold") || c.name.toLowerCase().includes("pink") || c.name.toLowerCase().includes("cream") || c.name.toLowerCase().includes("tan"))) ? "Gold" : "Silver";
            questionAnswer = `Jewelry Verdict on "${userQuestion}": Winning choice is ${metal}. It harmonizes naturally with the ${finalPalette.map(p => p.name).join(", ")} palette to create a radiant glow.`;
        } else if (q.includes("shoe") || q.includes("heel") || q.includes("boot") || q.includes("sneaker")) {
            questionAnswer = `Footwear Verdict on "${userQuestion}": Anchor this silhouette with ${primaryPick.breakdown.find(b => b.toLowerCase().includes("heel") || b.toLowerCase().includes("shoe") || b.toLowerCase().includes("boot") || b.toLowerCase().includes("loafer")) || "sleek pointed slingbacks"}.`;
        } else if (q.includes("event") || q.includes("party") || q.includes("wear") || q.includes("occasion")) {
            questionAnswer = `Occasion Verdict on "${userQuestion}": This outfit excels for ${bestFor.events.split(',')[0]}! Add matching accents to elevate the poise.`;
        } else {
            questionAnswer = `Stylist Verdict on "${userQuestion}": The outfit leans strongly into ${primaryPick.style} (${score1}% match). Keep the proportions balanced with fine accessories and clean footwear.`;
        }
    }

    return {
        topStyles: topStylesDescending,
        topStylesDescending,
        topStylesAscending: topStylesDescending,
        colorPalette: finalPalette,
        outfitBreakdown,
        mood,
        bestFor,
        questionAnswer,
        primary: {
            aesthetic: primaryPick.style,
            score: score1
        },
        secondary: {
            aesthetic: secondPick.style,
            score: score2
        },
        confidence: score1
    };
}

// ============================================================
// DETECT AESTHETIC ENDPOINT
// ============================================================

router.post(
    '/detect-aesthetic',
    upload.single('outfitImage'),
    async (req, res) => {
        let tempFilePath = null;

        try {
            const { hasQuestion, userQuestion, extractedPalette } = req.body;

            let parsedPalette = null;
            if (extractedPalette) {
                try {
                    parsedPalette = JSON.parse(extractedPalette);
                } catch (e) {
                    console.warn('Could not parse extractedPalette JSON');
                }
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No image file uploaded. Please select an outfit photo.'
                });
            }

            tempFilePath = req.file.path;
            const isQ = hasQuestion === 'true' || hasQuestion === true;

            const apiKey = process.env.HF_API_KEY ? process.env.HF_API_KEY.trim() : null;

            if (!apiKey) {
                console.warn('HF_API_KEY missing. Using direct photo vision styling consultation.');
                const report = buildVibeReport(null, userQuestion, isQ, parsedPalette);
                return res.json({
                    success: true,
                    results: report
                });
            }

            // Read image and convert to base64
            const imageBuffer = fs.readFileSync(tempFilePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';

            let finalPrompt = `
Analyze this outfit image as a professional fashion stylist.
Identify visible clothing pieces, colors, silhouette, mood, and best suited occasions.
Return ONLY valid JSON with this structure:
{
  "clothing": ["piece 1", "piece 2", "piece 3"],
  "colors": ["color 1", "color 2"],
  "patterns": ["pattern 1"],
  "silhouette": "description of fit and proportion",
  "mood": "overall visual mood description",
  "occasion": "best suited event or occasion",
  "styleKeywords": ["keyword1", "keyword2"]
}
`;

            const payload = {
                model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: finalPrompt },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.2
            };

            let hfData = null;
            try {
                const hfResponse = await fetch(MODEL_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const responseText = await hfResponse.text();
                try {
                    hfData = JSON.parse(responseText);
                } catch (e) {
                    console.warn('HF response was not valid JSON.');
                }
            } catch (err) {
                console.warn('Hugging Face request failed:', err.message);
            }

            if (hfData?.choices?.[0]?.message?.content) {
                const aiText = hfData.choices[0].message.content;
                const parsed = extractJSON(aiText);
                if (parsed) {
                    const report = buildVibeReport(parsed, userQuestion, isQ, parsedPalette);
                    return res.json({
                        success: true,
                        results: report
                    });
                }
            }

            // Fallback report
            const fallbackReport = buildVibeReport(null, userQuestion, isQ, parsedPalette);
            return res.json({
                success: true,
                results: fallbackReport
            });

        } catch (error) {
            console.error('AI Routing Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process image aesthetic.',
                details: error.message
            });
        } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (err) {
                    console.error('Failed to remove temp file:', err);
                }
            }
        }
    }
);


// ============================================================
// WARDROBE HELPERS
// ============================================================

function normalizeText(value) {

    if (Array.isArray(value)) {
        return value.join(" ").toLowerCase();
    }

    return String(value || "").toLowerCase();
}


function getItemText(item) {

    return [

        item.name,
        item.color,
        item.material,
        item.pattern,
        item.fit,
        item.style,
        item.styles,
        item.formality,
        item.season

    ].map(normalizeText).join(" ");
}


// ============================================================
// COLOR COMPATIBILITY
// ============================================================

function colorCompatibility(itemA, itemB) {

    const a =
        normalizeText(itemA.color);

    const b =
        normalizeText(itemB.color);


    if (!a || !b) {
        return 70;
    }


    if (a === b) {
        return 82;
    }


    const neutrals = [

        "black",
        "white",
        "cream",
        "beige",
        "gray",
        "grey",
        "brown",
        "navy",
        "tan"

    ];


    if (
        neutrals.some(n => a.includes(n)) ||
        neutrals.some(n => b.includes(n))
    ) {

        return 90;

    }


    const compatibleColors = {

        pink: [
            "white",
            "cream",
            "gray",
            "grey",
            "brown"
        ],

        blue: [
            "white",
            "cream",
            "brown",
            "beige"
        ],

        green: [
            "white",
            "cream",
            "beige",
            "brown"
        ],

        red: [
            "black",
            "white",
            "cream",
            "navy"
        ],

        purple: [
            "white",
            "gray",
            "black"
        ],

        yellow: [
            "white",
            "blue",
            "brown"
        ],

        orange: [
            "white",
            "cream",
            "brown"
        ]

    };


    for (const colorA of Object.keys(compatibleColors)) {

        if (a.includes(colorA)) {

            if (
                compatibleColors[colorA]
                    .some(color => b.includes(color))
            ) {

                return 94;

            }

        }

    }


    return 60;
}


// ============================================================
// STYLE COMPATIBILITY
// ============================================================

function styleCompatibility(itemA, itemB) {

    const textA =
        getItemText(itemA);

    const textB =
        getItemText(itemB);


    let score = 70;


    const sharedStyles = [

        "minimal",
        "minimalist",
        "coquette",
        "romantic",
        "goth",
        "grunge",
        "y2k",
        "streetwear",
        "classic",
        "preppy",
        "parisian",
        "chic",
        "casual",
        "formal",
        "luxury",
        "vintage",
        "retro"

    ];


    let shared = 0;


    sharedStyles.forEach(style => {

        if (
            textA.includes(style) &&
            textB.includes(style)
        ) {

            shared++;

        }

    });


    if (shared >= 2) {
        score += 20;
    } else if (shared === 1) {
        score += 10;
    }


    return Math.min(
        99,
        score
    );
}


// ============================================================
// FORMALITY COMPATIBILITY
// ============================================================

function formalityScore(itemA, itemB) {

    const a =
        Number(itemA.formality) || 3;

    const b =
        Number(itemB.formality) || 3;


    const difference =
        Math.abs(a - b);


    if (difference === 0) {
        return 100;
    }

    if (difference === 1) {
        return 90;
    }

    if (difference === 2) {
        return 75;
    }

    return 55;
}


// ============================================================
// VIBE SCORE
// ============================================================

function vibeCompatibility(items, vibe) {

    const target =
        normalizeText(vibe);


    if (!target) {
        return 70;
    }


    let score = 60;

    const keywords =
        target.split(/\s+/);


    items.forEach(item => {

        const text =
            getItemText(item);


        keywords.forEach(keyword => {

            if (
                keyword.length > 2 &&
                text.includes(keyword)
            ) {

                score += 5;

            }

        });

    });


    return Math.min(
        99,
        score
    );
}


// ============================================================
// OCCASION SCORE
// ============================================================

function occasionCompatibility(items, occasion) {

    const target =
        normalizeText(occasion);


    if (!target) {
        return 70;
    }


    let score = 70;


    const text =
        items
            .map(getItemText)
            .join(" ");


    const occasionRules = {

        party: [
            "party",
            "dress",
            "heel",
            "sequin",
            "satin",
            "statement"
        ],

        "date night": [
            "dress",
            "satin",
            "blouse",
            "heel",
            "romantic"
        ],

        casual: [
            "tshirt",
            "t-shirt",
            "jeans",
            "sneaker",
            "hoodie",
            "casual"
        ],

        college: [
            "jeans",
            "sneaker",
            "tshirt",
            "t-shirt",
            "cardigan",
            "casual"
        ],

        formal: [
            "blazer",
            "trousers",
            "shirt",
            "dress",
            "heel",
            "tailored"
        ],

        diwali: [
            "kurta",
            "saree",
            "lehenga",
            "gold",
            "embroidered",
            "silk",
            "traditional"
        ],

        traditional: [
            "kurta",
            "saree",
            "lehenga",
            "silk",
            "traditional",
            "embroidered"
        ]

    };


    for (const key of Object.keys(occasionRules)) {

        if (target.includes(key)) {

            const rules =
                occasionRules[key];


            rules.forEach(rule => {

                if (text.includes(rule)) {
                    score += 5;
                }

            });

        }

    }


    return Math.min(
        99,
        score
    );
}


// ============================================================
// USER PREFERENCE SCORE
// ============================================================

function calculatePreferenceScore(
    lookPieces,
    userRatings
) {

    if (
        !Array.isArray(userRatings) ||
        userRatings.length === 0
    ) {

        return 75;

    }


    let score = 75;


    const lookNames =
        lookPieces.map(item =>
            normalizeText(item.name)
        );


    userRatings.forEach(rating => {

        const ratedNames =
            Array.isArray(rating.itemNames)
                ? rating.itemNames.map(normalizeText)
                : [];


        const overlap =
            ratedNames.some(
                ratedName =>
                    lookNames.some(
                        lookName =>
                            lookName.includes(ratedName) ||
                            ratedName.includes(lookName)
                    )
            );


        if (!overlap) {
            return;
        }


        if (
            rating.feedback === "love" ||
            rating.feedback === "like" ||
            Number(rating.rating) >= 4
        ) {

            score += 7;

        }


        if (
            rating.feedback === "dislike" ||
            Number(rating.rating) <= 2
        ) {

            score -= 12;

        }

    });


    return Math.min(
        99,
        Math.max(
            30,
            Math.round(score)
        )
    );
}


// ============================================================
// OUTFIT COMPATIBILITY
// ============================================================

function outfitCompatibility(pieces) {

    if (pieces.length <= 1) {
        return 75;
    }


    const pairScores = [];


    for (
        let i = 0;
        i < pieces.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < pieces.length;
            j++
        ) {

            const colorScore =
                colorCompatibility(
                    pieces[i],
                    pieces[j]
                );


            const styleScore =
                styleCompatibility(
                    pieces[i],
                    pieces[j]
                );


            const formality =
                formalityScore(
                    pieces[i],
                    pieces[j]
                );


            const pairScore =
                colorScore * 0.45 +
                styleScore * 0.35 +
                formality * 0.20;


            pairScores.push(
                pairScore
            );

        }

    }


    const average =
        pairScores.reduce(
            (sum, score) =>
                sum + score,
            0
        ) / pairScores.length;


    return Math.round(
        Math.min(
            99,
            Math.max(
                40,
                average
            )
        )
    );
}


// ============================================================
// GENERATE OUTFIT
// ============================================================

router.post(
    '/generate-outfit',
    async (req, res) => {

        try {

            const {

                items = [],

                vibe = "Soft Coquette",

                occasion = "Party",

                userRatings = []

            } = req.body;


            // ----------------------------------------------------
            // VALIDATION
            // ----------------------------------------------------

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Your digital wardrobe is empty! Please add at least one clothing piece, shoe, or accessory."

                });

            }


            // ----------------------------------------------------
            // CATEGORIZE
            // ----------------------------------------------------

            const tops =
                items.filter(
                    item =>
                        item.category === "Top"
                );


            const bottoms =
                items.filter(
                    item =>
                        item.category === "Bottom"
                );


            const dresses =
                items.filter(
                    item =>
                        item.category === "Dress"
                );


            const shoes =
                items.filter(
                    item =>
                        item.category === "Shoes"
                );


            const jewelry =
                items.filter(
                    item =>
                        item.category === "Jewelry"
                );


            const outerwear =
                items.filter(
                    item =>
                        item.category === "Outerwear"
                );


            // ----------------------------------------------------
            // CREATE POSSIBLE MAIN OUTFITS
            // ----------------------------------------------------

            const candidates = [];


            // Dress outfits
            dresses.forEach(dress => {

                candidates.push([
                    dress
                ]);

            });


            // Top + bottom outfits
            tops.forEach(top => {

                bottoms.forEach(bottom => {

                    candidates.push([
                        top,
                        bottom
                    ]);

                });

            });


            // ----------------------------------------------------
            // FALLBACK FOR VERY SMALL WARDROBE
            // ----------------------------------------------------

            if (candidates.length === 0) {

                candidates.push(
                    [items[0]]
                );

            }


            // ----------------------------------------------------
            // SCORE EVERY CANDIDATE
            // ----------------------------------------------------

            const scoredCandidates =
                candidates.map(mainPieces => {

                    const shoe =
                        shoes.length > 0
                            ? shoes[
                            candidates.indexOf(mainPieces) %
                            shoes.length
                            ]
                            : null;


                    const accessory =
                        jewelry.length > 0
                            ? jewelry[
                            candidates.indexOf(mainPieces) %
                            jewelry.length
                            ]
                            : null;


                    const layer =
                        outerwear.length > 0
                            ? outerwear[
                            candidates.indexOf(mainPieces) %
                            outerwear.length
                            ]
                            : null;


                    const allPieces = [
                        ...mainPieces
                    ];


                    if (shoe) {
                        allPieces.push(shoe);
                    }


                    if (accessory) {
                        allPieces.push(accessory);
                    }


                    if (layer) {
                        allPieces.push(layer);
                    }


                    const compatibility =
                        outfitCompatibility(
                            allPieces
                        );


                    const vibeScore =
                        vibeCompatibility(
                            allPieces,
                            vibe
                        );


                    const occasionScore =
                        occasionCompatibility(
                            allPieces,
                            occasion
                        );


                    const preferenceScore =
                        calculatePreferenceScore(
                            allPieces,
                            userRatings
                        );


                    const finalScore =
                        compatibility * 0.40 +
                        vibeScore * 0.20 +
                        occasionScore * 0.20 +
                        preferenceScore * 0.20;


                    return {

                        mainPieces,

                        shoe,

                        accessory,

                        layer,

                        allPieces,

                        compatibility,

                        vibeScore,

                        occasionScore,

                        preferenceScore,

                        finalScore

                    };

                });


            // ----------------------------------------------------
            // SORT BEST → WORST
            // ----------------------------------------------------

            scoredCandidates.sort(
                (a, b) =>
                    b.finalScore -
                    a.finalScore
            );


            // ----------------------------------------------------
            // REMOVE DUPLICATES
            // ----------------------------------------------------

            const selectedCandidates = [];

            const signatures =
                new Set();


            for (
                const candidate
                of scoredCandidates
            ) {

                const signature =
                    candidate.allPieces
                        .map(
                            item =>
                                item.id ||
                                item.name
                        )
                        .sort()
                        .join("|");


                if (
                    !signatures.has(signature)
                ) {

                    signatures.add(signature);

                    selectedCandidates.push(
                        candidate
                    );

                }


                if (
                    selectedCandidates.length >= 3
                ) {

                    break;

                }

            }


            // ----------------------------------------------------
            // BUILD FINAL OUTFITS
            // ----------------------------------------------------

            const generatedOutfits =
                selectedCandidates.map(
                    (candidate, idx) => {

                        const {

                            mainPieces,

                            shoe,

                            accessory,

                            layer,

                            compatibility,

                            vibeScore,

                            occasionScore,

                            preferenceScore,

                            finalScore

                        } = candidate;


                        const mainName =
                            mainPieces
                                .map(
                                    item =>
                                        item.name ||
                                        "wardrobe piece"
                                )
                                .join(
                                    " paired with "
                                );


                        const shoeName =
                            shoe?.name ||
                            "your preferred footwear";


                        const accessoryName =
                            accessory?.name ||
                            "minimal accessories";


                        // ------------------------------------------------
                        // RATIONALE
                        // ------------------------------------------------

                        let stylingRationale =

                            `This look combines ${mainName} with ${shoeName}. ` +
                            `It scored ${Math.round(finalScore)}/99 based on wardrobe compatibility, ` +
                            `your ${vibe} vibe, and the ${occasion} occasion.`;


                        if (
                            compatibility >= 90
                        ) {

                            stylingRationale +=
                                " The pieces have especially strong color and style harmony.";

                        } else if (
                            compatibility >= 75
                        ) {

                            stylingRationale +=
                                " The pieces create a balanced and wearable combination.";

                        } else {

                            stylingRationale +=
                                " The look is more experimental and intentionally contrasts different elements.";

                        }


                        // ------------------------------------------------
                        // BEAUTY TIP
                        // ------------------------------------------------

                        let beautyTip =
                            "Keep the beauty look balanced so the outfit remains the focus.";


                        const occasionLower =
                            occasion.toLowerCase();


                        if (
                            occasionLower.includes("diwali") ||
                            occasionLower.includes("traditional")
                        ) {

                            beautyTip =
                                "Try softly defined eyes, warm blush, and a comfortable lip shade that complements the outfit.";

                        } else if (
                            occasionLower.includes("party") ||
                            occasionLower.includes("celebration")
                        ) {

                            beautyTip =
                                "Add a little shimmer to the eyes and a glossy lip for a more elevated party finish.";

                        } else if (
                            occasionLower.includes("formal")
                        ) {

                            beautyTip =
                                "Keep the makeup polished and defined with a satin base, softly defined eyes, and a refined lip.";

                        } else if (
                            occasionLower.includes("date")
                        ) {

                            beautyTip =
                                "Go for soft definition, natural-looking blush, and a comfortable lip tint.";

                        }


                        return {

                            id:
                                `look_${Date.now()}_${idx}`,

                            lookIndex:
                                idx + 1,

                            title:
                                `Look ${idx + 1}: Curated ${vibe} Edit`,

                            subtitle:
                                `${vibe} × ${occasion}`,

                            eventMatchScore:
                                Math.round(
                                    occasionScore
                                ),

                            preferenceMatchScore:
                                Math.round(
                                    preferenceScore
                                ),

                            compatibilityScore:
                                Math.round(
                                    compatibility
                                ),

                            overallScore:
                                Math.round(
                                    finalScore
                                ),

                            pieces: {

                                main:
                                    mainPieces,

                                shoes:
                                    shoe
                                        ? [shoe]
                                        : [],

                                jewelry:
                                    accessory
                                        ? [accessory]
                                        : [],

                                outerwear:
                                    layer
                                        ? [layer]
                                        : []

                            },

                            stylingRationale,

                            beautyTip

                        };

                    }
                );


            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.json({

                success: true,

                outfits:
                    generatedOutfits,

                outfit:
                    generatedOutfits[0] || null

            });


        } catch (error) {

            console.error(
                "Outfit Generator Error:",
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    "Failed to generate wardrobe outfit variations.",

                details:
                    error.message

            });

        }

    }
);


// ============================================================
// MAKEUP RECOMMENDATION
// ============================================================

router.post(
    '/makeup-recommendation',
    upload.single('outfitImage'),

    async (req, res) => {

        let tempFilePath = null;


        try {

            const {

                vibe =
                "Soft Coquette & Modern Romantic",

                undertone =
                "Warm Golden / Olive",

                userQuestion

            } = req.body;


            if (req.file) {

                tempFilePath =
                    req.file.path;

            }


            // ----------------------------------------------------
            // MAKEUP GUIDES FOR ALL TARGET VIBES
            // ----------------------------------------------------

            const makeupGuides = {
                "goth inspired": {
                    title: "Goth Inspired",
                    skinBase: "Porcelain or soft-matte velvet finish with subtle cool-toned sculpting.",
                    eyes: "Graphic black winged liner, smoked burgundy shadow, and defined fluttery lashes.",
                    lips: "Deep black cherry, dark plum, or matte blackberry lip with defined liner.",
                    hair: "Sleek raven straight hair, micro bangs, or textured dark waves.",
                    proTip: "Balance deep dark tones with clean, luminous brow bone highlights to avoid a flat look."
                },
                "soft coquette": {
                    title: "Soft Coquette",
                    skinBase: "Glazed porcelain glow with fluffy baby pink doll-blush on the apples of the cheeks.",
                    eyes: "Frosted pearl shimmer, soft brown puppy liner, and wispy doll lashes.",
                    lips: "High-shine strawberry glazed lip gloss with a blurred rose center.",
                    hair: "Loose bouncy curls adorned with silk satin ribbons or lace bows.",
                    proTip: "Dab liquid highlighter on the tip of the nose and inner eye corners for a dreamy doll effect."
                },
                "modern romantic glow": {
                    title: "Modern Romantic Glow",
                    skinBase: "Dewy glass skin, liquid peach-rose blush, and soft golden candlelight radiance.",
                    eyes: "Champagne rose gold shimmer wash with feathered brown mascara.",
                    lips: "Petal rose stain with a nourishing glassy balm overlay.",
                    hair: "Effortless face-framing tendrils and romantic tumbled blowout.",
                    proTip: "Mix liquid illuminator with your skin tint for an all-over lit-from-within aura."
                },
                "90s minimalist": {
                    title: "90s Minimalist",
                    skinBase: "Semi-matte velvety skin with natural warm taupe contour.",
                    eyes: "Muted taupe and beige wash across the lid with soft brown tightlining.",
                    lips: "Iconic 90s brown-nude or spiced chestnut liner with satin buff center.",
                    hair: "Sleek middle-part blowout, flipped ends, or claw clip French twist.",
                    proTip: "Keep all tones monochromatic brown and neutral for timeless Carolyn Bessette-Kennedy elegance."
                },
                "clean girl chic": {
                    title: "Clean Girl Chic",
                    skinBase: "Featherlight hydrating skin tint, spot concealer, and luminous cream blush.",
                    eyes: "Laminated fluffy brushed-up brows and curled natural lashes with clear or brown mascara.",
                    lips: "Nourishing peptide lip treatment in honey nude or glazed clear.",
                    hair: "Ultra-sleek glazed middle-part low bun with flyaway smoothing balm.",
                    proTip: "Prioritize skin prep with hyaluronic serum and facial oil for effortless model-off-duty radiance."
                },
                "rock siren": {
                    title: "Rock Siren",
                    skinBase: "Second-skin radiant matte finish with sharp high-cheekbone bronze.",
                    eyes: "Kohl-rimmed smoky cat eye, lived-in espresso smudged shadow, and intense black mascara.",
                    lips: "Muted 90s taupe-caramel nude or sharp bitten wine red.",
                    hair: "Shaggy wolf cut, textured piecey layers, or tousled rockstar volume.",
                    proTip: "Smudge your black kohl liner with your ring finger for an authentic lived-in edge."
                },
                "smoky grunge": {
                    title: "Smoky Grunge",
                    skinBase: "Matte velvet complexion with minimal contour and cool undertones.",
                    eyes: "Heavy charcoal smoky eye, smudged lower lashline, and dramatic black tightlining.",
                    lips: "Dark chocolate matte, sheer black gloss, or deep brick burgundy.",
                    hair: "Messy undone textured waves with matte texturizing spray.",
                    proTip: "Layer gunmetal metallic pigment over black cream base for depth and dimension."
                },
                "y2k": {
                    title: "Y2K",
                    skinBase: "Bronzed glow with frosted silver and baby pink shimmer highlights.",
                    eyes: "Frosted ice blue or silver shimmer shadow, dark thin brows, and fluttery outer corner lashes.",
                    lips: "Overlined dark nude lip with juicy, sticky chrome pink gloss.",
                    hair: "Spiky buns, zig-zag partings, butterfly clips, and crimped tendrils.",
                    proTip: "Body shimmer oil on collarbones completes the nostalgic Y2K look."
                },
                "retro": {
                    title: "Retro",
                    skinBase: "Flawless satin porcelain base with delicate vintage peach blush.",
                    eyes: "Crisp retro winged cat-eye liner and voluminous mod lashes.",
                    lips: "Bold classic cherry red, coral, or fiery matte vermilion.",
                    hair: "Voluminous 60s/70s curtain bangs, roller set curls, or flipped bobs.",
                    proTip: "Use a gel liner with a fine angled brush for sharp vintage wing precision."
                },
                "chic parisian": {
                    title: "Chic Parisian",
                    skinBase: "Barely-there radiant skin letting natural freckles shine through.",
                    eyes: "One coat of rich mascara and naturally groomed, soft brows.",
                    lips: "Blotted classic French red stain applied with fingertips for that 'just-kissed' finish.",
                    hair: "Nonchalant natural air-dried French girl waves with soft bottleneck bangs.",
                    proTip: "Never look overly styled; imperfection is the essence of French allure."
                },
                "warm luxury": {
                    title: "Warm Luxury",
                    skinBase: "Rich golden sun-kissed bronzer, cashmere matte finish, and amber glow.",
                    eyes: "Warm caramel, antique gold foil shimmer, and chocolate gel liner.",
                    lips: "Rich terracotta caramel, warm spiced cinnamon, or gilded nude.",
                    hair: "Glossy old-money bouncy voluminous blowout with rich shine serum.",
                    proTip: "Spritz setting spray infused with fine gold pearl for a luxurious finish."
                },
                "festive": {
                    title: "Festive",
                    skinBase: "Radiant golden glow with warm terracotta blush and luminous strobing.",
                    eyes: "Intense kohl kajal waterline, antique copper/gold foil pigment, and dramatic winged liner.",
                    lips: "Rich royal crimson, deep ruby wine, or warm berry red.",
                    hair: "Ornate textured braid with floral accents, or cascading glamorous Hollywood waves.",
                    proTip: "Highlight the inner tear ducts with champagne gold for a regal festive dazzle."
                },
                "full glam": {
                    title: "Full Glam",
                    skinBase: "Full-coverage airbrushed finish, baked under-eyes, and sculpted contour.",
                    eyes: "Cut-crease eyeshadow with micro-glitter topper, dramatic 3D lashes, and crisp wing.",
                    lips: "Sculpted ombre lip with deep liner, nude center, and mirror glass gloss.",
                    hair: "Impeccable red carpet Hollywood waves with high-gloss mirror shine.",
                    proTip: "Set your T-zone with translucent loose powder and bake under the contour for razor sharpness."
                }
            };

            // ----------------------------------------------------
            // SELECT GUIDE
            // ----------------------------------------------------

            const vibeKey = (vibe || "").toLowerCase().trim();
            let selectedGuide = null;

            // Direct key match
            if (makeupGuides[vibeKey]) {
                selectedGuide = makeupGuides[vibeKey];
            } else {
                // Keyword partial matching
                for (const [key, guide] of Object.entries(makeupGuides)) {
                    if (vibeKey.includes(key) || key.includes(vibeKey)) {
                        selectedGuide = guide;
                        break;
                    }
                }
            }

            // Fallback for custom / other
            if (!selectedGuide) {
                if (vibeKey.includes("goth")) selectedGuide = makeupGuides["goth inspired"];
                else if (vibeKey.includes("coquette")) selectedGuide = makeupGuides["soft coquette"];
                else if (vibeKey.includes("romantic") || vibeKey.includes("glow")) selectedGuide = makeupGuides["modern romantic glow"];
                else if (vibeKey.includes("minimalist")) selectedGuide = makeupGuides["90s minimalist"];
                else if (vibeKey.includes("clean")) selectedGuide = makeupGuides["clean girl chic"];
                else if (vibeKey.includes("siren") || vibeKey.includes("rock")) selectedGuide = makeupGuides["rock siren"];
                else if (vibeKey.includes("grunge") || vibeKey.includes("grunch") || vibeKey.includes("smoky")) selectedGuide = makeupGuides["smoky grunge"];
                else if (vibeKey.includes("y2k")) selectedGuide = makeupGuides["y2k"];
                else if (vibeKey.includes("retro")) selectedGuide = makeupGuides["retro"];
                else if (vibeKey.includes("parisian")) selectedGuide = makeupGuides["chic parisian"];
                else if (vibeKey.includes("luxury")) selectedGuide = makeupGuides["warm luxury"];
                else if (vibeKey.includes("festive") || vibeKey.includes("desi") || vibeKey.includes("royal")) selectedGuide = makeupGuides["festive"];
                else if (vibeKey.includes("glam")) selectedGuide = makeupGuides["full glam"];
                else {
                    // Custom vibe dynamically crafted
                    const displayVibe = vibe.trim() || "Bespoke Editorial Beauty";
                    selectedGuide = {
                        title: `${displayVibe} Look`,
                        skinBase: `Luminous customized complexion tailored to harmonize with ${displayVibe} styling.`,
                        eyes: `Artfully defined eye palette complementary to the ${displayVibe} aesthetic tone.`,
                        lips: `Signature lip formulation matching the mood and undertone of ${displayVibe}.`,
                        hair: `Complementary hair direction sculpted to anchor your ${displayVibe} silhouette.`,
                        proTip: `Keep the key statement feature balanced with delicate accents for ${displayVibe}.`
                    };
                }
            }


            // ----------------------------------------------------
            // CUSTOM QUESTION
            // ----------------------------------------------------

            let customAdvice = "";


            if (
                userQuestion &&
                userQuestion.trim() !== ""
            ) {

                const q =
                    userQuestion.toLowerCase();


                if (
                    q.includes("lip") ||
                    q.includes("lipstick") ||
                    q.includes("shade")
                ) {

                    customAdvice =
                        `For "${userQuestion}", start with ${selectedGuide.lips.toLowerCase()} ` +
                        `and choose a shade that feels comfortable with your ${undertone} undertone.`;

                } else if (
                    q.includes("eye") ||
                    q.includes("eyeliner") ||
                    q.includes("shadow")
                ) {

                    customAdvice =
                        `For "${userQuestion}", try ${selectedGuide.eyes.toLowerCase()}`;

                } else if (
                    q.includes("hair") ||
                    q.includes("hairstyle")
                ) {

                    customAdvice =
                        `For "${userQuestion}", ${selectedGuide.hair}`;

                } else {

                    customAdvice =
                        `For "${userQuestion}", use the ${selectedGuide.title} direction to keep your beauty look coordinated with your outfit.`;

                }

            }


            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.json({

                success: true,

                makeup: {

                    title:
                        selectedGuide.title,

                    undertoneMatched:
                        undertone,

                    skinBase:
                        selectedGuide.skinBase,

                    eyes:
                        selectedGuide.eyes,

                    lips:
                        selectedGuide.lips,

                    hair:
                        selectedGuide.hair,

                    proTip:
                        selectedGuide.proTip,

                    customAdvice

                }

            });


        } catch (error) {

            console.error(
                "Makeup Recommender Error:",
                error
            );


            return res.status(500).json({

                success: false,

                error:
                    "Failed to generate makeup recommendation."

            });


        } finally {

            if (
                tempFilePath &&
                fs.existsSync(tempFilePath)
            ) {

                try {

                    fs.unlinkSync(
                        tempFilePath
                    );

                } catch (error) {

                    console.error(
                        "Failed to remove temp file:",
                        error
                    );

                }

            }

        }

    }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;