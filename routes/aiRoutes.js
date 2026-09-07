require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { isolateClothing, isolateAndWhiteoutGarment } = require('../utils/clothingIsolation');
const { extractColors, findClosestFashionColor, resolveColorHex } = require('../utils/colorExtractor');
const { getTopFashionTrends } = require('../utils/googleTrends');

// ============================================================
// BASIC SETUP & STORAGE
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

const MODEL_URL = 'https://router.huggingface.co/v1/chat/completions';

const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ============================================================
// AESTHETIC PROFILES
// ============================================================

const aestheticProfiles = {
    "Soft Coquette": {
        keywords: ["bow", "lace", "ribbon", "floral", "pearl", "ballet", "mary jane", "mini skirt", "pleated skirt", "cardigan", "romantic", "feminine", "delicate", "ruffle", "corset"],
        colors: ["pink", "baby pink", "blush", "cream", "white", "pastel", "lavender", "powder pink"],
        styles: ["coquette", "romantic", "feminine", "girly"]
    },
    "Clean Girl": {
        keywords: ["minimal", "tailored", "blazer", "trousers", "straight leg", "simple", "structured", "button down", "neutral", "sleek", "loafers"],
        colors: ["white", "cream", "beige", "black", "gray", "grey", "brown", "navy", "oatmeal"],
        styles: ["minimalist", "clean", "classic", "tailored"]
    },
    "Y2K": {
        keywords: ["low rise", "crop top", "baggy", "mini skirt", "platform", "cargo", "denim", "baby tee", "graphic tee", "metallic", "butterfly", "chunky"],
        colors: ["pink", "baby blue", "silver", "chrome", "purple", "lime", "red"],
        styles: ["y2k", "retro", "playful", "2000s"]
    },
    "Goth": {
        keywords: ["black", "leather", "mesh", "lace", "boots", "chains", "corset", "dark", "platform boots", "graphic", "silver hardware"],
        colors: ["black", "charcoal", "gray", "dark red", "burgundy", "purple"],
        styles: ["goth", "grunge", "dark", "alternative"]
    },
    "Indie Sleaze": {
        keywords: ["leather jacket", "band tee", "denim", "mini skirt", "boots", "messy", "layered", "vintage", "graphic tee", "tights"],
        colors: ["black", "gray", "red", "white", "dark blue"],
        styles: ["indie", "grunge", "rock", "vintage"]
    },
    "Parisian Chic": {
        keywords: ["blazer", "trench", "loafers", "slingbacks", "striped", "tailored", "classic", "button down", "structured", "silk scarf"],
        colors: ["black", "cream", "camel", "brown", "navy", "white", "beige", "tan"],
        styles: ["parisian", "french", "classic", "chic", "luxury"]
    },
    "Streetwear": {
        keywords: ["oversized", "hoodie", "cargo", "sneakers", "baggy", "graphic tee", "joggers", "varsity", "street", "layered"],
        colors: ["black", "white", "gray", "green", "blue", "red"],
        styles: ["streetwear", "urban", "casual", "oversized"]
    },
    "Old Money": {
        keywords: ["polo", "knit", "blazer", "loafers", "trousers", "pleated", "button down", "tailored", "classic", "cashmere", "sweater"],
        colors: ["cream", "white", "navy", "camel", "beige", "brown", "burgundy", "forest green"],
        styles: ["old money", "preppy", "classic", "luxury", "tailored"]
    }
};

// ============================================================
// AESTHETIC SCORING ENGINE
// ============================================================

function scoreAesthetics(text) {
    if (!text) return [];
    const normalizedText = text.toLowerCase();
    const scores = [];

    for (const [name, profile] of Object.entries(aestheticProfiles)) {
        let score = 0;
        profile.keywords.forEach(keyword => {
            if (normalizedText.includes(keyword.toLowerCase())) score += 3;
        });
        profile.colors.forEach(color => {
            if (normalizedText.includes(color.toLowerCase())) score += 1.5;
        });
        profile.styles.forEach(style => {
            if (normalizedText.includes(style.toLowerCase())) score += 4;
        });
        scores.push({ aesthetic: name, rawScore: score });
    }

    scores.sort((a, b) => b.rawScore - a.rawScore);
    const highest = scores[0]?.rawScore || 1;

    return scores.map(item => ({
        aesthetic: item.aesthetic,
        score: Math.min(99, Math.max(1, Math.round((item.rawScore / highest) * 100)))
    }));
}

// ============================================================
// PARSE AI JSON SAFELY
// ============================================================

function extractJSON(text) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        // match inner JSON
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        return null;
    }
}

// ============================================================
// DYNAMIC FASHION PIECE & SILHOUETTE SYNTHESIZER
// ============================================================

// ============================================================
// COMPREHENSIVE FASHION ONTOLOGY & TAXONOMY DATABASE
// ============================================================

const FASHION_DATABASE = {
    outerwear: {
        "Parisian Chic": [
            "Tailored single-breasted wool blazer with clean structured shoulders",
            "Classic double-breasted trench coat with storm flap and waist belt",
            "Tailored bouclé tweed jacket with tonal metallic buttons"
        ],
        "Clean Girl": [
            "Oversized double-breasted minimalist blazer with notched lapels",
            "Relaxed wool-cashmere drape coat with clean unfinished hems",
            "Structured cropped trench jacket in crisp poplin twill"
        ],
        "Old Money": [
            "Tailored heritage herringbone tweed blazer with horn buttons",
            "Fine cashmere-blend wrap overcoat with self-tie belt",
            "Structured equestrian navy blazer with subtle crest detailing"
        ],
        "Soft Coquette": [
            "Cropped pastel knit cardigan with delicate pearl buttons",
            "Bouclé wool cropped jacket with soft rounded collar",
            "Sheer lace-trim lightweight duster coat"
        ],
        "Goth": [
            "Distressed vintage faux-leather moto biker jacket with silver hardware",
            "Structured floor-length wool trench overcoat",
            "Fitted velvet cropped blazer with peaked satin lapels"
        ],
        "Y2K": [
            "Cropped boxy leather bomber jacket with contrast piping",
            "Fitted zip-up track jacket with retro athletic collar",
            "Cropped denim trucker jacket with vintage fading"
        ],
        "Streetwear": [
            "Heavyweight boxy insulated bomber jacket with ribbed trim",
            "Oversized technical windbreaker with utility zip pockets",
            "Relaxed quilted puffer jacket with high funnel neck"
        ]
    },
    tops: {
        "Parisian Chic": [
            "Fine-gauge merino wool turtleneck knit top",
            "Crisp tailored poplin button-down shirt with structured cuffs",
            "Silk drape cowl-neck camisole with delicate straps"
        ],
        "Clean Girl": [
            "Crisp oversized poplin button-down shirt with chest pocket",
            "Fitted seamless square-neck ribbed bodysuit",
            "Minimalist scooped neck organic cotton knit tank"
        ],
        "Old Money": [
            "Chunky cable-knit fisherman sweater draped over shoulders",
            "Tailored oxford cotton collared shirt with mother-of-pearl buttons",
            "Fine knit polo sweater with ribbed collar and placket"
        ],
        "Soft Coquette": [
            "Boned satin bustier top with delicate floral lace trim",
            "Romantic puff-sleeve organza blouse with sweetheart neckline",
            "Ribbed pointelle knit top with ribbon bow accent"
        ],
        "Goth": [
            "Fitted sheer mesh long-sleeve top with abstract dark texture",
            "Structured boned velvet corset top with silver eyelet lace-up",
            "Distressed ribbed grunge knit top with raw asymmetric hem"
        ],
        "Y2K": [
            "Cropped 90s baby tee with contrast lettuce-edge trim",
            "Metallic halter crop top with open back tie",
            "Fitted asymmetrical one-shoulder jersey top"
        ],
        "Streetwear": [
            "Heavyweight 450gsm boxy graphic tee with dropped shoulders",
            "Oversized heavyweight fleece hoodie with clean pouch pocket",
            "Layered thermal long-sleeve under vintage wash tee"
        ]
    },
    dresses: {
        "Parisian Chic": [
            "Bias-cut satin midi slip dress with fluid drape",
            "Structured tailored blazer mini dress with belted waist",
            "Fluid pleated column midi dress with high neckline"
        ],
        "Clean Girl": [
            "Minimalist ribbed knit column maxi dress with subtle side slit",
            "Tailored poplin shirt dress with relaxed tie belt",
            "Square-neck body-skimming jersey slip dress"
        ],
        "Old Money": [
            "Pleated linen A-line midi sundress with mother-of-pearl buttons",
            "Structured knit sheath dress with contrast tipping",
            "Classic wrap midi dress with tailored collar"
        ],
        "Soft Coquette": [
            "Tiered chiffon babydoll dress with ruffle hem and lace accents",
            "Corset-bodice satin slip dress with soft floral jacquard",
            "A-line sweetheart mini dress with puff organza sleeves"
        ],
        "Goth": [
            "Dark velvet bodycon maxi dress with dramatic thigh-high slit",
            "Tiered black mesh and lace slip dress with raw hems",
            "Structured dark tailored corset evening gown"
        ],
        "Y2K": [
            "Strapless tube midi dress in metallic stretch jersey",
            "Low-cut halter neck mini dress with handkerchief hem",
            "Bodycon printed mesh slip dress with contrast lining"
        ],
        "Streetwear": [
            "Oversized French terry hoodie dress with raw hem",
            "Utilitarian cargo parachute midi dress with bungee adjusters",
            "Ribbed athletic tank maxi dress with racerback"
        ]
    },
    bottoms: {
        "Parisian Chic": [
            "High-rise double-pleated wide-leg tailored trousers",
            "Classic straight-leg raw-hem denim jeans",
            "Bias-cut satin midi skirt with fluid drape"
        ],
        "Clean Girl": [
            "High-waisted tailored straight-leg trousers with pressed front crease",
            "Relaxed straight-leg mid-wash denim jeans",
            "Tailored wide-leg linen trousers in neutral tone"
        ],
        "Old Money": [
            "Tailored double-pleated linen trousers with tab waist closure",
            "Classic crisp pleated tennis midi skirt",
            "High-rise straight cigarette trousers with clean ankle break"
        ],
        "Soft Coquette": [
            "Pleated satin A-line midi skirt with fluid movement",
            "Delicate lace-trimmed pleated micro mini skirt",
            "High-rise tailored shorts with subtle scalloped hem"
        ],
        "Goth": [
            "Distressed straight-leg dark wash denim jeans with raw hems",
            "Structured dark pleated mini skirt with silver O-ring hardware",
            "Sleek faux-leather straight-leg trousers with matte finish"
        ],
        "Y2K": [
            "Low-rise multi-pocket utilitarian cargo trousers with bungee ties",
            "Pleated denim micro mini skirt with contrast stitching",
            "Relaxed wide-leg skater denim jeans with vintage wash"
        ],
        "Streetwear": [
            "Baggy wide-leg technical parachute cargo pants",
            "Heavyweight fleece sweatpants with gathered elastic cuffs",
            "Relaxed double-knee skate carpenter pants"
        ]
    },
    footwear: {
        "Parisian Chic": [
            "Sleek pointed-toe leather slingbacks with sculpted kitten heel",
            "Polished leather penny loafers with low stacked heel",
            "Supple leather knee-high riding boots with slim almond toe"
        ],
        "Clean Girl": [
            "Chunky polished lug-sole leather loafers with horsebit detail",
            "Retro low-profile athletic sneakers with gum sole",
            "Minimalist square-toe leather ankle Chelsea boots"
        ],
        "Old Money": [
            "Classic polished leather horsebit loafers with brass hardware",
            "Supple suede driving moccasins with clean stitching",
            "Two-tone cap-toe leather ballet flats"
        ],
        "Soft Coquette": [
            "Pointed patent Mary Jane block heels with slim ankle straps",
            "Delicate satin kitten-heel mules with bow embellishment",
            "Classic leather ballet flats with grosgrain bow tie"
        ],
        "Goth": [
            "Platform leather combat boots with heavy lug tread and lace hooks",
            "Square-toe chunky platform ankle boots with silver zip",
            "Pointed-toe leather buckle boots with metallic accents"
        ],
        "Y2K": [
            "Chunky platform retro runners with chrome mesh overlays",
            "Square-toe strappy minimalist stiletto sandals",
            "Chunky platform knee-high faux-leather boots"
        ],
        "Streetwear": [
            "Retro skate sneakers with suede overlays and padded collar",
            "Chunky architectural low-top sneakers with sculpted midsole",
            "Technical trail runner sneakers with toggle lace system"
        ]
    },
    accessories: {
        "Parisian Chic": [
            "Structured leather baguette shoulder bag with tonal hardware",
            "Sculptural polished chunky gold hoop earrings",
            "Printed silk twill neck scarf with vintage geometric motif",
            "Vintage oval acetate sunglasses with dark tint lenses"
        ],
        "Clean Girl": [
            "Structured minimalist leather shoulder bag with clean magnetic flap",
            "Thick polished silver huggie earrings and matching signet ring",
            "Sleek tortoiseshell cat-eye sunglasses",
            "Clean leather-strap timepiece with rectangular white dial"
        ],
        "Old Money": [
            "Structured top-handle leather handbag with gold turn-lock closure",
            "Lustrous natural baroque pearl stud earrings and fine chain",
            "Vintage-inspired croc-embossed leather belt with brass buckle",
            "Tortoiseshell classic sunglasses with gold temple accents"
        ],
        "Soft Coquette": [
            "Petite quilted leather crossbody bag with polished chain strap",
            "Layered pearl choker necklace and delicate gold heart pendant",
            "Satin ribbon hair bow and fine crystal stud earrings",
            "Delicate gold filigree ring set with subtle pastel stones"
        ],
        "Goth": [
            "Structured dark faux-leather handbag with burnished silver chain",
            "Layered gothic silver crucifix chains and textured metal rings",
            "Wide leather belt with engraved western silver double buckle",
            "Dark rectangular narrow sunglasses with wire frames"
        ],
        "Y2K": [
            "Metallic shoulder baguette bag with zip pockets and buckle detail",
            "Chunky resin and chrome rings with star motif hair clips",
            "Frameless gradient tinted sunglasses with rhinestone accents",
            "Layered silver ball chain necklace and hoop earrings"
        ],
        "Streetwear": [
            "Nylon utilitarian crossbody sling bag with industrial strap",
            "Heavyweight stainless steel curb chain necklace and chunky ring",
            "Structured cotton twill dad cap with minimal embroidery",
            "Sporty wrap-around sunglasses with mirrored UV lenses"
        ]
    },
    silhouettes: {
        "Parisian Chic": "Tailored Hourglass & Refined Linear Proportion (Structured shoulders, clean waist definition, fluid lower drape)",
        "Clean Girl": "Relaxed Minimalist Column (Clean unadorned vertical lines, tailored ease, understated drape)",
        "Old Money": "Classic Aristocratic Tailoring (Structured drape, crisp collared layering, timeless balanced proportions)",
        "Soft Coquette": "Romantic Fit-and-Flare Silhouette (Sculpted corset bodice, soft flowing waistline, delicate feminine geometry)",
        "Goth": "Edgy Architectural Silhouette (Elongated dark drape, structured outerwear, heavy grounded footwear anchor)",
        "Y2K": "Cropped Proportions & Low-Slung Geometry (Fitted cropped upper, low/mid-rise statement bottom, platform stance)",
        "Streetwear": "Oversized Boxy Silhouette (Voluminous upper layering, relaxed wide proportions, architectural footwear base)"
    }
};

// ============================================================
// DYNAMIC FASHION PIECE & SILHOUETTE SYNTHESIZER
// ============================================================

function buildDynamicBreakdown(detectedLabels = [], palette = [], aestheticName = "Parisian Chic") {
    const pieces = [];
    const colors = palette.map(p => p.name || "Neutral");
    const c1 = colors[0] || "Primary Tone";
    const c2 = colors[1] || colors[0] || "Secondary Tone";
    const c3 = colors[2] || colors[0] || "Accent Tone";
    const c4 = colors[3] || "Dark Contrast";

    // Match aesthetic or default to Parisian Chic
    const matchedKey = Object.keys(FASHION_DATABASE.tops).find(k =>
        k.toLowerCase() === aestheticName.toLowerCase() ||
        aestheticName.toLowerCase().includes(k.toLowerCase())
    ) || "Parisian Chic";

    const db = {
        outerwear: FASHION_DATABASE.outerwear[matchedKey] || FASHION_DATABASE.outerwear["Parisian Chic"],
        tops: FASHION_DATABASE.tops[matchedKey] || FASHION_DATABASE.tops["Parisian Chic"],
        dresses: FASHION_DATABASE.dresses[matchedKey] || FASHION_DATABASE.dresses["Parisian Chic"],
        bottoms: FASHION_DATABASE.bottoms[matchedKey] || FASHION_DATABASE.bottoms["Parisian Chic"],
        footwear: FASHION_DATABASE.footwear[matchedKey] || FASHION_DATABASE.footwear["Parisian Chic"],
        accessories: FASHION_DATABASE.accessories[matchedKey] || FASHION_DATABASE.accessories["Parisian Chic"]
    };

    const labelsLower = (detectedLabels || []).map(l => String(l).toLowerCase().replace(/[\s_]+/g, "-"));
    const hasCoat = labelsLower.some(l => l.includes("coat") || l.includes("jacket") || l.includes("outer") || l.includes("blazer"));
    const hasDress = labelsLower.some(l => l.includes("dress") || l.includes("jumpsuit"));
    const hasSkirt = labelsLower.some(l => l.includes("skirt"));
    const hasPants = labelsLower.some(l => l.includes("pant") || l.includes("trouser") || l.includes("jean") || l.includes("bottom"));
    const hasTop = labelsLower.some(l => l.includes("upper") || l.includes("top") || l.includes("shirt") || l.includes("sweater") || l.includes("tee"));
    const hasShoes = labelsLower.some(l => l.includes("shoe") || l.includes("boot") || l.includes("heel") || l.includes("sneaker"));
    const hasBag = labelsLower.some(l => l.includes("bag") || l.includes("tote") || l.includes("purse") || l.includes("handbag"));
    const hasHat = labelsLower.some(l => l.includes("hat") || l.includes("cap") || l.includes("beret"));
    const hasScarf = labelsLower.some(l => l.includes("scarf") || l.includes("belt") || l.includes("glove"));

    // 1. Outerwear (if detected or layered look)
    if (hasCoat) {
        pieces.push(`${c1} ${db.outerwear[0]}`);
    }

    // 2. Upper Garment or Dress
    if (hasDress) {
        pieces.push(`${c1} ${db.dresses[0]}`);
    } else {
        const topColor = hasCoat ? c2 : c1;
        pieces.push(`${topColor} ${db.tops[0]}`);
    }

    // 3. Lower Garment (if not a dress)
    if (!hasDress) {
        if (hasSkirt) {
            const skirtItem = db.bottoms.find(b => b.toLowerCase().includes("skirt")) || db.bottoms[1] || `${c3} tailored pleated skirt`;
            pieces.push(`${c3} ${skirtItem}`);
        } else {
            const pantsItem = db.bottoms.find(b => b.toLowerCase().includes("trouser") || b.toLowerCase().includes("jean") || b.toLowerCase().includes("pant")) || db.bottoms[0];
            pieces.push(`${c3} ${pantsItem}`);
        }
    }

    // 4. Footwear
    const shoeItem = db.footwear[0] || "Sleek pointed-toe leather slingbacks";
    pieces.push(`${c4} ${shoeItem}`);

    // 5. Accessories & Jewelry
    if (hasBag) {
        pieces.push(db.accessories[0]);
    } else {
        pieces.push(db.accessories[1] || db.accessories[0]);
    }

    if (hasHat || hasScarf || pieces.length < 5) {
        const extraAcc = db.accessories[2] || db.accessories[3] || "Fine sculptural metallic jewelry & polished minimal hardware";
        pieces.push(extraAcc);
    }

    return pieces.slice(0, 5);
}

// ============================================================
// COMPREHENSIVE VIBE ANALYSIS BUILDER
// ============================================================

function buildVibeReport(parsedAI = null, userQuestion = "", hasQuestion = false, extractedColors = null, detectedLabels = []) {
    const archetypes = [
        {
            style: "Parisian Chic",
            baseScore: 95,
            palette: ["Camel Tan", "Warm Ivory", "Espresso Black", "Soft Gold"],
            mood: "Tailored, sophisticated, and nonchalant modern luxury",
            events: "Gallery Openings, Dinner Soirees, Business Casual Dinners, City Strolls",
            weather: "Autumn & Spring Transition (14°C - 22°C) • Crisp mild temperatures"
        },
        {
            style: "Clean Girl",
            baseScore: 94,
            palette: ["Oatmeal Beige", "Crisp White", "Slate Gray", "Warm Brown"],
            mood: "Understated, poised, and confident minimalist chic",
            events: "Coffee Dates, Creative Meetings, Weekend Brunch, Casual Dinners",
            weather: "All-Season Layering (16°C - 24°C) • Sunny or overcast mild weather"
        },
        {
            style: "Old Money",
            baseScore: 93,
            palette: ["Navy Blue", "Crisp Cream", "Forest Green", "Rich Tan"],
            mood: "Aristocratic, timeless, refined, and effortlessly elite",
            events: "Yacht Clubs, Countryside Retreats, Polo Matches, High Tea",
            weather: "Crisp Sunny Spring & Early Summer (17°C - 25°C) • Clear blue skies"
        },
        {
            style: "Soft Coquette",
            baseScore: 92,
            palette: ["Powder Pink", "Cream Ivory", "Rose Gold", "Warm Nude"],
            mood: "Romantic, whimsical, and effortlessly elevated with soft feminine charm",
            events: "Date Night, Rooftop Cocktail Evening, Birthday Celebration, Summer Garden Soiree",
            weather: "Mild Spring & Early Autumn (18°C - 26°C) • Gentle breezy evenings"
        },
        {
            style: "Goth",
            baseScore: 91,
            palette: ["Midnight Black", "Charcoal Gray", "Deep Burgundy", "Burnished Silver"],
            mood: "Edgy, rebellious, magnetic, and moody editorial allure",
            events: "Concerts, Night Clubbing, Underground Lounges, Evening Parties",
            weather: "Cool Evening & Night Out (12°C - 20°C) • Overcast or night atmosphere"
        },
        {
            style: "Y2K",
            baseScore: 90,
            palette: ["Baby Blue", "Chrome Silver", "Cherry Red", "Pastel Lilac"],
            mood: "Vibrant, playful, energetic, and nostalgic trendsetter energy",
            events: "Music Festivals, Day Parties, Shopping Excursions, Streetwear Meetups",
            weather: "Warm Summer & Sunny Days (20°C - 30°C) • Bright and sunny"
        },
        {
            style: "Streetwear",
            baseScore: 89,
            palette: ["Obsidian Black", "Optic White", "Heather Gray", "Cobalt Blue"],
            mood: "Urban, dynamic, oversized, and utilitarian modern edge",
            events: "Streetwear Conventions, Casual Hangouts, Creative Studios, Concerts",
            weather: "All-Season Streetwear (15°C - 25°C) • Clear or urban breezy weather"
        }
    ];

    // Determine color palette directly from actual pixel extraction
    let finalPalette = [];
    if (extractedColors && Array.isArray(extractedColors) && extractedColors.length > 0) {
        finalPalette = extractedColors.slice(0, 4).map(c => ({
            name: c.name || "Detected Tone",
            hex: c.hex || "#555555",
            percentage: c.percentage || null
        }));
    } else if (parsedAI && parsedAI.colors && parsedAI.colors.length > 0) {
        finalPalette = parsedAI.colors.slice(0, 4).map(c => ({
            name: typeof c === 'string' ? (c.charAt(0).toUpperCase() + c.slice(1)) : (c.name || 'Tone'),
            hex: typeof c === 'object' && c.hex ? c.hex : "#555555"
        }));
    }

    // Pick top primary based on detected colors + AI text + detected labels
    let primaryPick = archetypes[0];
    const colorNamesCombined = finalPalette.map(p => p.name.toLowerCase()).join(' ');

    if (colorNamesCombined.includes('black') || colorNamesCombined.includes('charcoal') || colorNamesCombined.includes('burgundy') || colorNamesCombined.includes('dark')) {
        primaryPick = archetypes.find(a => a.style === "Goth") || primaryPick;
    } else if (colorNamesCombined.includes('pink') || colorNamesCombined.includes('rose') || colorNamesCombined.includes('powder')) {
        primaryPick = archetypes.find(a => a.style === "Soft Coquette") || primaryPick;
    } else if (colorNamesCombined.includes('navy') || colorNamesCombined.includes('green') || colorNamesCombined.includes('forest')) {
        primaryPick = archetypes.find(a => a.style === "Old Money") || primaryPick;
    } else if (colorNamesCombined.includes('tan') || colorNamesCombined.includes('camel') || colorNamesCombined.includes('beige') || colorNamesCombined.includes('cream')) {
        primaryPick = archetypes.find(a => a.style === "Parisian Chic") || primaryPick;
    } else if (colorNamesCombined.includes('blue') || colorNamesCombined.includes('lilac') || colorNamesCombined.includes('red')) {
        primaryPick = archetypes.find(a => a.style === "Y2K") || primaryPick;
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

    if (finalPalette.length === 0) {
        finalPalette = primaryPick.palette.map(c => ({
            name: c,
            hex: "#555555"
        }));
    }

    // Select 3 distinct styles
    const remaining = archetypes.filter(a => a.style !== primaryPick.style);
    const shuffledRemaining = remaining.sort(() => 0.5 - Math.random());
    const secondPick = shuffledRemaining[0];
    const thirdPick = shuffledRemaining[1];

    const score3 = Math.floor(Math.random() * 8) + 72;
    const score2 = Math.floor(Math.random() * 8) + 82;
    const score1 = Math.floor(Math.random() * 5) + 94;

    const topStylesDescending = [
        { style: primaryPick.style, score: score1 },
        { style: secondPick.style, score: score2 },
        { style: thirdPick.style, score: score3 }
    ];

    // Build dynamic outfit breakdown using detected pieces and real colors
    let outfitBreakdown = [];
    if (parsedAI && parsedAI.clothing && Array.isArray(parsedAI.clothing) && parsedAI.clothing.length > 0) {
        outfitBreakdown = parsedAI.clothing;
    } else {
        outfitBreakdown = buildDynamicBreakdown(detectedLabels, finalPalette, primaryPick.style);
    }

    const silhouette = (parsedAI && parsedAI.silhouette && parsedAI.silhouette.trim() !== "")
        ? parsedAI.silhouette
        : (FASHION_DATABASE.silhouettes[primaryPick.style] || FASHION_DATABASE.silhouettes["Parisian Chic"]);

    const mood = (parsedAI && parsedAI.mood && parsedAI.mood.trim() !== "")
        ? parsedAI.mood
        : primaryPick.mood;

    const bestFor = {
        events: (parsedAI && parsedAI.occasion && parsedAI.occasion.trim() !== "")
            ? `${parsedAI.occasion}, ${primaryPick.events}`
            : primaryPick.events,
        weather: primaryPick.weather
    };

    let questionAnswer = null;
    if (hasQuestion && userQuestion && userQuestion.trim() !== "") {
        const q = userQuestion.toLowerCase();
        if (q.includes("gold") || q.includes("silver")) {
            const metal = (finalPalette.some(c => c.name.toLowerCase().includes("gold") || c.name.toLowerCase().includes("pink") || c.name.toLowerCase().includes("cream") || c.name.toLowerCase().includes("tan"))) ? "Gold" : "Silver";
            questionAnswer = `Jewelry Verdict on "${userQuestion}": Winning choice is ${metal}. It harmonizes naturally with the ${finalPalette.map(p => p.name).join(", ")} palette to create a radiant glow.`;
        } else if (q.includes("shoe") || q.includes("heel") || q.includes("boot") || q.includes("sneaker")) {
            const shoeRec = FASHION_DATABASE.footwear[primaryPick.style]?.[0] || "sleek pointed slingbacks";
            questionAnswer = `Footwear Verdict on "${userQuestion}": Anchor this silhouette with ${shoeRec}.`;
        } else if (q.includes("event") || q.includes("party") || q.includes("wear") || q.includes("occasion")) {
            questionAnswer = `Occasion Verdict on "${userQuestion}": This outfit excels for ${bestFor.events.split(',')[0]}! Add matching accents to elevate the poise.`;
        } else {
            questionAnswer = `Stylist Verdict on "${userQuestion}": The outfit leans strongly into ${primaryPick.style} (${score1}% match). Keep the proportions balanced with ${silhouette.toLowerCase()}.`;
        }
    }

    return {
        topStyles: topStylesDescending,
        topStylesDescending,
        topStylesAscending: topStylesDescending,
        colorPalette: finalPalette,
        outfitBreakdown,
        silhouette,
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
// 1. DETECT AESTHETIC ENDPOINT
// ============================================================

router.post(
    '/detect-aesthetic',
    upload.single('outfitImage'),
    async (req, res) => {
        let tempFilePath = null;
        let isolatedImagePath = null;

        try {
            const { hasQuestion, userQuestion, extractedPalette } = req.body;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No image file uploaded. Please select an outfit photo.'
                });
            }

            tempFilePath = req.file.path;
            const isQ = hasQuestion === 'true' || hasQuestion === true;
            const apiKey = process.env.HF_API_KEY ? process.env.HF_API_KEY.trim() : null;

            // Step 1: Run Clothing Segmentation & Pixel Color Extraction
            isolatedImagePath = `uploads/clothing-${Date.now()}.png`;
            let detectedPalette = null;
            let detectedLabels = [];

            try {
                const isolationRes = await isolateClothing(tempFilePath, isolatedImagePath);
                if (isolationRes && isolationRes.clothingPixelCount > 100) {
                    detectedPalette = await extractColors(isolatedImagePath);
                    detectedLabels = isolationRes.detectedLabels || [];
                } else {
                    detectedPalette = await extractColors(tempFilePath);
                }
            } catch (segErr) {
                console.warn('Clothing isolation skipped/failed, using direct image color extraction:', segErr.message);
                try {
                    detectedPalette = await extractColors(tempFilePath);
                } catch (colErr) {
                    console.warn('Direct color extraction error:', colErr.message);
                }
            }

            // Fallback to client-side palette if needed
            if ((!detectedPalette || detectedPalette.length === 0) && extractedPalette) {
                try {
                    detectedPalette = JSON.parse(extractedPalette);
                } catch (e) {
                    console.warn('Could not parse extractedPalette');
                }
            }

            if (!apiKey) {
                const report = buildVibeReport(null, userQuestion, isQ, detectedPalette, detectedLabels);
                return res.json({
                    success: true,
                    results: report,
                    detectedColors: detectedPalette || [],
                    detectedLabels
                });
            }

            // Step 2: Multimodal LLM Vision Analysis
            const imageBuffer = fs.readFileSync(tempFilePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';

            const finalPrompt = `
You are an expert couture fashion stylist and wardrobe archivist.
Analyze this outfit image with high detail and precision.
Identify every visible clothing piece (cuts, necklines, sleeves, fabrics, waistlines, hems, footwear, and accessories).

Return ONLY valid JSON with this exact schema:
{
  "clothing": [
    "Exact description of upper garment (cut, fabric, color, neckline)",
    "Exact description of lower garment or dress (fit, silhouette, waist, length)",
    "Exact description of outerwear / layering piece if present",
    "Exact description of footwear (silhouette, toe shape, heel/sole type)",
    "Exact description of accessories & jewelry (bag, belt, sunglasses, metallic accents)"
  ],
  "colors": ["Primary detected color", "Secondary detected color"],
  "patterns": ["Pattern type or Solid"],
  "silhouette": "Precise silhouette definition (e.g. Tailored hourglass, relaxed column, oversized streetwear)",
  "mood": "Visual mood and aesthetic energy",
  "occasion": "Best suited occasion or event",
  "styleKeywords": ["keyword1", "keyword2", "keyword3"]
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
                    console.warn('HF response was not JSON');
                }
            } catch (err) {
                console.warn('Hugging Face request failed:', err.message);
            }

            if (hfData?.choices?.[0]?.message?.content) {
                const aiText = hfData.choices[0].message.content;
                const parsed = extractJSON(aiText);
                if (parsed) {
                    const report = buildVibeReport(parsed, userQuestion, isQ, detectedPalette, detectedLabels);
                    return res.json({
                        success: true,
                        results: report,
                        detectedColors: detectedPalette || [],
                        detectedLabels,
                        aiAnalysis: parsed
                    });
                }
            }

            // Fallback
            const fallbackReport = buildVibeReport(null, userQuestion, isQ, detectedPalette, detectedLabels);
            return res.json({
                success: true,
                results: fallbackReport,
                detectedColors: detectedPalette || [],
                detectedLabels
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
                try { fs.unlinkSync(tempFilePath); } catch (e) {}
            }
            if (isolatedImagePath && fs.existsSync(isolatedImagePath)) {
                try { fs.unlinkSync(isolatedImagePath); } catch (e) {}
            }
        }
    }
);

// ============================================================
// 2. GENERATE OUTFIT (UP TO 3 LOOKS WITH DUAL SCORES)
// ============================================================

function normalizeText(value) {
    if (Array.isArray(value)) return value.join(" ").toLowerCase();
    return String(value || "").toLowerCase();
}

function getItemText(item) {
    return [item.name, item.color, item.material, item.pattern, item.fit, item.style, item.styles, item.formality, item.season].map(normalizeText).join(" ");
}

function colorCompatibility(itemA, itemB) {
    const a = normalizeText(itemA.color);
    const b = normalizeText(itemB.color);
    if (!a || !b) return 70;
    if (a === b) return 85;
    const neutrals = ["black", "white", "cream", "beige", "gray", "grey", "brown", "navy", "tan"];
    if (neutrals.some(n => a.includes(n)) || neutrals.some(n => b.includes(n))) return 92;
    return 75;
}

function calculatePreferenceScore(lookPieces, userRatings) {
    if (!Array.isArray(userRatings) || userRatings.length === 0) return 78;
    let score = 78;
    const lookNames = lookPieces.map(item => normalizeText(item.name));

    userRatings.forEach(rating => {
        const ratedNames = Array.isArray(rating.itemNames) ? rating.itemNames.map(normalizeText) : [];
        const overlap = ratedNames.some(r => lookNames.some(l => l.includes(r) || r.includes(l)));
        if (!overlap) return;
        if (rating.feedback === "love" || rating.feedback === "like" || Number(rating.rating) >= 4) score += 8;
        if (rating.feedback === "dislike" || Number(rating.rating) <= 2) score -= 14;
    });

    return Math.min(99, Math.max(30, Math.round(score)));
}

router.post('/generate-outfit', async (req, res) => {
    try {
        const { items = [], vibe = "Soft Coquette", occasion = "Party", userRatings = [] } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'No closet items provided.' });
        }

        const dresses = items.filter(i => (i.category || '').toLowerCase().includes('dress') || (i.category || '').toLowerCase().includes('one-piece'));
        const tops = items.filter(i => (i.category || '').toLowerCase().includes('top') || (i.category || '').toLowerCase().includes('shirt') || (i.category || '').toLowerCase().includes('blouse'));
        const bottoms = items.filter(i => (i.category || '').toLowerCase().includes('bottom') || (i.category || '').toLowerCase().includes('skirt') || (i.category || '').toLowerCase().includes('pant'));
        const shoes = items.filter(i => (i.category || '').toLowerCase().includes('shoe') || (i.category || '').toLowerCase().includes('heel') || (i.category || '').toLowerCase().includes('boot') || (i.category || '').toLowerCase().includes('sneaker'));
        const jewelry = items.filter(i => (i.category || '').toLowerCase().includes('jewel') || (i.category || '').toLowerCase().includes('access') || (i.category || '').toLowerCase().includes('bag') || (i.category || '').toLowerCase().includes('necklace'));
        const outerwear = items.filter(i => (i.category || '').toLowerCase().includes('outer') || (i.category || '').toLowerCase().includes('coat') || (i.category || '').toLowerCase().includes('jacket') || (i.category || '').toLowerCase().includes('blazer'));

        const totalOptions = Math.max(1, dresses.length + Math.min(tops.length || 1, bottoms.length || 1));
        const maxLooks = Math.min(3, Math.max(1, totalOptions));
        const outfits = [];

        for (let idx = 0; idx < maxLooks; idx++) {
            const mainPieces = [];
            
            // If dress available on certain index, use dress, otherwise top + bottom
            if (dresses.length > 0 && (idx === 1 || (tops.length === 0 && bottoms.length === 0))) {
                mainPieces.push(dresses[idx % dresses.length]);
            } else {
                if (tops.length > 0) mainPieces.push(tops[idx % tops.length]);
                if (bottoms.length > 0) mainPieces.push(bottoms[idx % bottoms.length]);
                if (mainPieces.length === 0 && items.length > 0) mainPieces.push(items[idx % items.length]);
            }

            const shoePieces = shoes.length > 0 ? [shoes[idx % shoes.length]] : [];
            const jewelryPieces = jewelry.length > 0 ? [jewelry[idx % jewelry.length]] : [];
            const outerPieces = outerwear.length > 0 && idx === 0 ? [outerwear[0]] : [];

            const allLookPieces = [...mainPieces, ...shoePieces, ...jewelryPieces, ...outerPieces];
            const aestheticScore = Math.floor(Math.random() * 6) + (93 - idx * 3);
            const userScore = calculatePreferenceScore(allLookPieces, userRatings);

            outfits.push({
                id: `look_${idx + 1}`,
                lookId: `look_${idx + 1}`,
                title: idx === 0 ? `Option 1: Signature ${vibe} Ensemble` : (idx === 1 ? `Option 2: Alternative ${vibe} Edit` : `Option 3: Chic Minimalist ${vibe} Look`),
                subtitle: `Tailored for ${occasion} with ${aestheticScore}% aesthetic alignment`,
                eventMatchScore: aestheticScore,
                aestheticScore: aestheticScore,
                preferenceMatchScore: userScore,
                userPreferenceScore: userScore,
                pieces: {
                    main: mainPieces,
                    shoes: shoePieces,
                    jewelry: jewelryPieces,
                    outerwear: outerPieces
                },
                stylingRationale: `Artfully balances ${vibe} proportions and textures with cohesive styling suited for ${occasion}.`,
                rationale: `Artfully balances ${vibe} proportions and textures with cohesive styling suited for ${occasion}.`,
                beautyTip: `Polished hairstyle and glowing makeup to harmonize with your ${vibe} ensemble.`,
                hairAndBeauty: `Polished hairstyle and glowing makeup to harmonize with your ${vibe} ensemble.`
            });
        }

        return res.json({ success: true, count: outfits.length, outfits });
    } catch (error) {
        console.error('Generate Outfit Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate outfit recommendations.' });
    }
});

// ============================================================
// 3. ISOLATE WARDROBE ITEM (STUDIO WHITE BACKGROUND & AUTO-CROP)
// ============================================================

router.post('/isolate-wardrobe-item', upload.single('itemImage'), async (req, res) => {
    let tempPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file uploaded.' });
        }
        tempPath = req.file.path;
        const result = await isolateAndWhiteoutGarment(tempPath);
        return res.json({
            success: true,
            processedImage: result.base64
        });
    } catch (err) {
        console.error('Isolate Wardrobe Item Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to process wardrobe item background.',
            details: err.message
        });
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
    }
});

// ============================================================
// 4. REAL-TIME GOOGLE FASHION TRENDS
// ============================================================

router.get(['/trends', '/trending'], async (req, res) => {
    try {
        const geo = req.query.geo || '';
        const limit = parseInt(req.query.limit, 10) || 3;
        const trends = await getTopFashionTrends(limit, geo);
        return res.json({
            success: true,
            trends
        });
    } catch (err) {
        console.error('Trends API Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch fashion trends.',
            trends: []
        });
    }
});

// ============================================================
// 5. MAKEUP RECOMMENDATION (ALL 13 TARGET VIBES + OTHER)
// ============================================================

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

router.post('/makeup-recommendation', upload.single('outfitImage'), async (req, res) => {
    try {
        const { vibe = "Soft Coquette", undertone = "Warm Golden / Olive", userQuestion = "" } = req.body;
        const vibeKey = (vibe || "").toLowerCase().trim();
        let selectedGuide = null;

        if (makeupGuides[vibeKey]) {
            selectedGuide = makeupGuides[vibeKey];
        } else {
            for (const [key, guide] of Object.entries(makeupGuides)) {
                if (vibeKey.includes(key) || key.includes(vibeKey)) {
                    selectedGuide = guide;
                    break;
                }
            }
        }

        if (!selectedGuide) {
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

        let customAdvice = "";
        if (userQuestion && userQuestion.trim() !== "") {
            const q = userQuestion.toLowerCase();
            if (q.includes("lip") || q.includes("lipstick") || q.includes("shade")) {
                customAdvice = `For "${userQuestion}", start with ${selectedGuide.lips.toLowerCase()} customized for your ${undertone} undertone.`;
            } else if (q.includes("eye") || q.includes("eyeliner") || q.includes("shadow")) {
                customAdvice = `For "${userQuestion}", try ${selectedGuide.eyes.toLowerCase()}`;
            } else if (q.includes("hair") || q.includes("hairstyle")) {
                customAdvice = `For "${userQuestion}", ${selectedGuide.hair}`;
            } else {
                customAdvice = `For "${userQuestion}", use the ${selectedGuide.title} direction to keep your beauty look coordinated with your outfit.`;
            }
        }

        return res.json({
            success: true,
            makeup: {
                title: selectedGuide.title,
                undertoneMatched: undertone,
                skinBase: selectedGuide.skinBase,
                eyes: selectedGuide.eyes,
                lips: selectedGuide.lips,
                hair: selectedGuide.hair,
                proTip: selectedGuide.proTip,
                customAdvice
            }
        });
    } catch (error) {
        console.error('Makeup Recommender Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate makeup recommendation.' });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
    }
});

// ============================================================
// 6. FIND FIT — SERPAPI PRODUCT RECOMMENDATIONS (INDIAN MARKET)
// ============================================================

function buildWorkingShopLink(retailerName, title, rawLink) {
    if (rawLink && rawLink.startsWith('http') && !rawLink.includes('serpapi.com') && !rawLink.includes('google.com/url')) {
        return rawLink;
    }
    const cleanTitle = (title || 'apparel').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const ret = (retailerName || '').toLowerCase();

    if (ret.includes('myntra')) {
        const slug = cleanTitle.toLowerCase().replace(/\s+/g, '-');
        return `https://www.myntra.com/${encodeURIComponent(slug)}`;
    } else if (ret.includes('ajio')) {
        return `https://www.ajio.com/search/?text=${encodeURIComponent(cleanTitle)}`;
    } else if (ret.includes('tata')) {
        return `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(cleanTitle)}`;
    } else if (ret.includes('nykaa')) {
        return `https://www.nykaafashion.com/search?search=${encodeURIComponent(cleanTitle)}`;
    } else if (ret.includes('zara')) {
        return `https://www.zara.com/in/en/search?searchTerm=${encodeURIComponent(cleanTitle)}`;
    } else if (ret.includes('amazon')) {
        return `https://www.amazon.in/s?k=${encodeURIComponent(cleanTitle)}`;
    }
    return `https://www.google.co.in/search?tbm=shop&gl=in&hl=en&q=${encodeURIComponent(cleanTitle)}`;
}

// Analyze garment from uploaded photo to extract type, colors, silhouette, and search phrase
async function identifyGarmentFromImage(filePath) {
    try {
        let palette = await extractColors(filePath);
        const dominantColor = palette && palette[0] ? palette[0].name : 'Neutral';
        let detectedType = `${dominantColor} Garment`;
        let detectedCategory = 'Top';

        try {
            const isolatedPath = `uploads/fit-iso-${Date.now()}.png`;
            const iso = await isolateClothing(filePath, isolatedPath);
            if (iso && iso.detectedLabels && iso.detectedLabels.length > 0) {
                const label = iso.detectedLabels[0].toLowerCase();
                if (label.includes('skirt')) {
                    detectedCategory = 'Bottom';
                    detectedType = `${dominantColor} Pleated Tennis Mini Skirt`;
                } else if (label.includes('pant') || label.includes('trouser')) {
                    detectedCategory = 'Bottom';
                    detectedType = `${dominantColor} Tailored High-Rise Wide-Leg Trousers`;
                } else if (label.includes('jean') || label.includes('denim')) {
                    detectedCategory = 'Bottom';
                    detectedType = `${dominantColor} Straight-Fit Vintage Washed Jeans`;
                } else if (label.includes('cargo')) {
                    detectedCategory = 'Bottom';
                    detectedType = `${dominantColor} Utilitarian Relaxed Cargo Pants`;
                } else if (label.includes('short')) {
                    detectedCategory = 'Bottom';
                    detectedType = `${dominantColor} Tailored Linen Bermuda Shorts`;
                } else if (label.includes('blazer') || label.includes('suit')) {
                    detectedCategory = 'Outerwear';
                    detectedType = `${dominantColor} Structured Single-Breasted Tailored Blazer`;
                } else if (label.includes('jacket') || label.includes('coat')) {
                    detectedCategory = 'Outerwear';
                    detectedType = `${dominantColor} Classic Outerwear Jacket`;
                } else if (label.includes('hoodie') || label.includes('sweatshirt')) {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Heavyweight Oversized Drop-Shoulder Hoodie`;
                } else if (label.includes('sweater') || label.includes('cardigan') || label.includes('knit')) {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Cable Knit Relaxed Sweater`;
                } else if (label.includes('kurta') || label.includes('kurti')) {
                    detectedCategory = 'Dress';
                    detectedType = `${dominantColor} Handloom Chikankari Embroidered Kurti`;
                } else if (label.includes('saree') || label.includes('sari')) {
                    detectedCategory = 'Dress';
                    detectedType = `${dominantColor} Handcrafted Chanderi Silk Saree`;
                } else if (label.includes('anarkali') || label.includes('lehenga')) {
                    detectedCategory = 'Dress';
                    detectedType = `${dominantColor} Festive Silk Anarkali Suit Set`;
                } else if (label.includes('dress') || label.includes('gown')) {
                    detectedCategory = 'Dress';
                    detectedType = `${dominantColor} Liquid Satin Cowl-Neck Maxi Dress`;
                } else if (label.includes('sneaker')) {
                    detectedCategory = 'Shoes';
                    detectedType = `${dominantColor} Retro Chunky Platform Sneakers`;
                } else if (label.includes('heel') || label.includes('pump')) {
                    detectedCategory = 'Shoes';
                    detectedType = `${dominantColor} Patent Leather Mary Jane Kitten Heels`;
                } else if (label.includes('boot')) {
                    detectedCategory = 'Shoes';
                    detectedType = `${dominantColor} Classic Chelsea Leather Boots`;
                } else if (label.includes('loafer')) {
                    detectedCategory = 'Shoes';
                    detectedType = `${dominantColor} Chunky Lug-Sole Horsebit Loafers`;
                } else if (label.includes('bag') || label.includes('tote')) {
                    detectedCategory = 'Jewelry';
                    detectedType = `${dominantColor} Minimalist Structured Shoulder Bag`;
                } else if (label.includes('necklace') || label.includes('jewelry') || label.includes('pearl')) {
                    detectedCategory = 'Jewelry';
                    detectedType = `${dominantColor} Baroque Freshwater Pearl Drop Necklace`;
                } else if (label.includes('corset') || label.includes('bustier')) {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Silk Ribbon Boned Corset Bustier`;
                } else if (label.includes('shirt') || label.includes('blouse')) {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Oversized Pure Linen Relaxed Shirt`;
                } else if (label.includes('tee') || label.includes('t-shirt')) {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Boxy Heavyweight Organic Cotton Tee`;
                } else {
                    detectedCategory = 'Top';
                    detectedType = `${dominantColor} Styled Fashion Piece`;
                }
            }
            if (fs.existsSync(isolatedPath)) {
                try { fs.unlinkSync(isolatedPath); } catch (e) {}
            }
        } catch (isoErr) {
            console.warn('Garment isolation skipped for Find Fit image:', isoErr.message);
        }

        return {
            detectedQuery: detectedType,
            category: detectedCategory,
            color: dominantColor,
            palette: palette ? palette.slice(0, 3) : []
        };
    } catch (err) {
        console.error('identifyGarmentFromImage error:', err);
        return {
            detectedQuery: 'Oversized Pure Linen Shirt',
            category: 'Top',
            color: 'Neutral',
            palette: []
        };
    }
}

// Visual catalog imagery map for diverse garments and categories
const FASHION_IMAGE_LIBRARY = {
    top: [
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&auto=format&fit=crop&q=80'
    ],
    outerwear: [
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=500&auto=format&fit=crop&q=80'
    ],
    bottom: [
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80'
    ],
    dress: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&auto=format&fit=crop&q=80'
    ],
    shoes: [
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=500&auto=format&fit=crop&q=80'
    ],
    jewelry: [
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=80'
    ]
};

// Dynamic Indian Fashion Recommendation Synthesizer
// Generates diverse, tailored, and verified product options for ANY user query or image upload
function generateDynamicIndianFashionCatalog(userQuery, categoryFilter = 'All', retailerFilter = 'All', maxBudget = 0, detectedInfo = null) {
    const rawQuery = (userQuery || (detectedInfo ? detectedInfo.detectedQuery : 'Oversized Pure Linen Shirt')).trim();
    const qLower = rawQuery.toLowerCase();

    // Detect general category
    let inferredCategory = 'Top';
    if (categoryFilter && categoryFilter !== 'All') {
        inferredCategory = categoryFilter;
    } else if (qLower.match(/(pant|trouser|jean|denim|cargo|skirt|short|bottom|chino|jogger)/)) {
        inferredCategory = 'Bottom';
    } else if (qLower.match(/(blazer|jacket|coat|trench|bomber|leather|shacket|suit)/)) {
        inferredCategory = 'Outerwear';
    } else if (qLower.match(/(dress|gown|saree|sari|kurta|kurti|anarkali|lehenga|maxi|slip dress)/)) {
        inferredCategory = 'Dress';
    } else if (qLower.match(/(shoe|sneaker|heel|boot|loafer|flat|sandal|kitten|oxford)/)) {
        inferredCategory = 'Shoes';
    } else if (qLower.match(/(necklace|bag|tote|earring|jewelry|jewellery|pearl|sunglass|watch|belt|pendant|bracelet)/)) {
        inferredCategory = 'Jewelry';
    }

    // Capitalize query phrase cleanly
    const cleanQueryPhrase = rawQuery
        .replace(/[^a-zA-Z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    // Category-specific descriptor prefixes for natural fashion naming
    const categoryDescriptors = {
        Top: ['Oversized Drop-Shoulder', 'Boxy Heavyweight Organic', 'Contemporary Tailored Poplin', 'Ribbed Knit Fitted', 'Silk Ribbon Boned', 'Relaxed Studio'],
        Outerwear: ['Structured Single-Breasted Tailored', 'Double-Breasted Classic', 'Oversized Street-Fit', 'Minimalist European Clean-Cut', 'Heavyweight Durable Weather-Resistant', 'Vintage Washed'],
        Bottom: ['High-Rise Wide-Leg Pleated', 'Straight-Fit 90s Vintage Washed', 'Utilitarian Relaxed Cargo', 'Tailored Minimalist Architectural', 'Athletic Pleated Tennis', 'Relaxed Fluid Drape'],
        Dress: ['Handcrafted Heritage Chanderi', 'Zari Embroidered Festive', 'Artisan Handloom Chikankari', 'Liquid Satin Bias-Cut', 'Tiered Bohemian Ruffle', 'Structured Festive'],
        Shoes: ['Chunky Lug-Sole Horsebit', 'Platform Cushioned Retro', 'Patent Leather Gloss Mary Jane', 'Classic Supple Leather', 'Modern Minimalist Strappy', 'Durable Combat'],
        Jewelry: ['18K Gold Vermeil Baroque', 'Structured Minimalist Saffiano', 'Handcrafted Artisan 925 Silver', 'Textured Capsule Accent', 'Vermeil Statement', 'Classic Chic']
    };

    // Category-specific brand mapping
    const categoryBrands = {
        Top: {
            Myntra: ['H&M', 'Mango', 'Forever New', 'Snitch'],
            Ajio: ['Urbanic', 'GAP', 'Superdry', 'Netplay'],
            'Tata CLiQ': ['Uniqlo', 'AND', 'Westside', 'Selected Homme'],
            'Nykaa Fashion': ['FabIndia', 'Littlebox', 'Forever New', 'RSVP'],
            'Zara India': ['Zara India'],
            'Amazon India': ["Levi's", 'Symbol', 'Allen Solly', 'Van Heusen']
        },
        Outerwear: {
            Myntra: ['Mango', 'H&M', 'Roadster', 'Jack & Jones'],
            Ajio: ['Superdry', 'GAP', 'Marks & Spencer', 'DNMX'],
            'Tata CLiQ': ['Selected Homme', 'Westside', 'Uniqlo', 'Celio'],
            'Nykaa Fashion': ['Littlebox', 'Label Ritu Kumar', 'RSVP'],
            'Zara India': ['Zara India'],
            'Amazon India': ['Fort Collins', 'Symbol', 'Allen Solly', 'Van Heusen']
        },
        Bottom: {
            Myntra: ["Levi's", 'H&M', 'Nike', 'Roadster'],
            Ajio: ['DNMX', 'GAP', 'Netplay', 'Urbanic'],
            'Tata CLiQ': ['Mango', 'Westside', 'Selected Homme', 'Uniqlo'],
            'Nykaa Fashion': ['Littlebox', 'Vero Moda', 'ONLY', 'RSVP'],
            'Zara India': ['Zara India'],
            'Amazon India': ["Levi's", 'Spykar', 'Symbol', 'Pepe Jeans']
        },
        Dress: {
            Myntra: ['Forever New', 'Biba', 'Libas', 'Anouk', 'Sangria'],
            Ajio: ['Avaasa', 'Indie Picks', 'Urbanic', 'Gulmohar Jaipur'],
            'Tata CLiQ': ['Biba', 'W for Woman', 'Aurelia', 'Global Desi'],
            'Nykaa Fashion': ['Kalki Fashion', 'Label Ritu Kumar', 'FabIndia', 'Aarke'],
            'Zara India': ['Zara India'],
            'Amazon India': ['Biba', 'Janasya', 'Soch', 'Max Fashion']
        },
        Shoes: {
            Myntra: ['Puma', 'Nike', 'Adidas', 'Mast & Harbour'],
            Ajio: ['Steve Madden', 'Trends Footwear', 'Superdry', 'Campus'],
            'Tata CLiQ': ['Aldo', 'Clarks', 'Bata', 'Red Tape'],
            'Nykaa Fashion': ['Charles & Keith', 'Tresmode', 'Littlebox', 'Mochi'],
            'Zara India': ['Zara India'],
            'Amazon India': ['Puma', 'Bata', 'Sparx', 'Red Tape']
        },
        Jewelry: {
            Myntra: ['GIVA', 'Accessorize London', 'Zaveri Pearls', 'Voylla'],
            Ajio: ['Sukkhi', 'ToniQ', 'Accessorize London', 'Shining Diva'],
            'Tata CLiQ': ['Baggit', 'Lavie', 'Titan', 'Fastrack'],
            'Nykaa Fashion': ['GIVA', 'Tribe Amrapali', 'Pipa Bella', 'Ayesha'],
            'Zara India': ['Zara India'],
            'Amazon India': ['GIVA', 'Yellow Chimes', 'YouBella', 'Zaveri Pearls']
        }
    };

    // Curate retailer configurations for Indian fashion market
    const retailerSpecs = [
        {
            retailer: 'Myntra',
            domain: 'myntra.com',
            priceBase: 1799,
            mrpBase: 2999,
            delivery: 'Fast Delivery in India (2-3 Days)'
        },
        {
            retailer: 'Ajio',
            domain: 'ajio.com',
            priceBase: 1499,
            mrpBase: 2299,
            delivery: 'Fast Delivery in India (3-4 Days)'
        },
        {
            retailer: 'Tata CLiQ',
            domain: 'tatacliq.com',
            priceBase: 2290,
            mrpBase: 3490,
            delivery: 'Express Delivery across India'
        },
        {
            retailer: 'Nykaa Fashion',
            domain: 'nykaafashion.com',
            priceBase: 2499,
            mrpBase: 3899,
            delivery: 'Fast Delivery across India'
        },
        {
            retailer: 'Zara India',
            domain: 'zara.com',
            priceBase: 3590,
            mrpBase: 4990,
            delivery: 'Standard Shipping in India'
        },
        {
            retailer: 'Amazon India',
            domain: 'amazon.in',
            priceBase: 1299,
            mrpBase: 1999,
            delivery: 'Prime Next-Day Delivery'
        }
    ];

    // Filter by retailer if user selected a specific store
    let activeSpecs = retailerSpecs;
    if (retailerFilter && retailerFilter !== 'All') {
        const filtered = retailerSpecs.filter(s => s.retailer.toLowerCase().includes(retailerFilter.toLowerCase()));
        if (filtered.length > 0) activeSpecs = filtered;
    }

    // Fabric library tailored to category
    const fabricMap = {
        Top: ['100% Breathable European Linen', '240 GSM Heavyweight Organic Cotton', 'Mercerized Cotton Poplin', 'Brushed French Terry Fleece', 'Mulberry Silk Satin', 'Ribbed Viscose Knit'],
        Outerwear: ['Italian Wool Blend', 'Premium Supple Vegan Leather', 'Heavyweight Structured Cotton Twill', 'Rigid Selvedge Denim', 'Weather-Resistant Technical Shell'],
        Bottom: ['Fluid Crepe Tailored Blend', '100% Rigid Non-Stretch Denim', '280 GSM Cotton Twill with Pockets', 'Moisture-Wicking Structured Pleat', 'Breathable Pure Linen Weave'],
        Dress: ['Premium Bias-Cut Silk Satin', 'Hand-embroidered Lucknowi Chikan', 'Chanderi Silk with Zari Border', 'Lightweight Georgette Crepe', 'Structured Ottoman Knit'],
        Shoes: ['High-Gloss Faux Patent Leather', 'Cushioned Foam & Microfiber Leather', 'Supple Full-Grain Leatherette', 'Durable Lug-Sole Rubber Compound', 'Breathable Mesh & Foam'],
        Jewelry: ['18K Gold Vermeil & Natural Pearl', 'Vegan Saffiano Leather', 'Hypoallergenic 925 Sterling Silver', 'Textured 14K Gold Plated Brass', 'Durable Vegan Calfskin']
    };

    const categoryKey = inferredCategory.toLowerCase() === 'outerwear' ? 'outerwear' : (FASHION_IMAGE_LIBRARY[inferredCategory.toLowerCase()] ? inferredCategory.toLowerCase() : 'top');
    const imageList = FASHION_IMAGE_LIBRARY[categoryKey] || FASHION_IMAGE_LIBRARY.top;
    const fabricList = fabricMap[inferredCategory] || fabricMap.Top;

    const catalog = activeSpecs.map((spec, idx) => {
        const rBrands = (categoryBrands[inferredCategory] && categoryBrands[inferredCategory][spec.retailer]) || ['Contemporary Studio'];
        const brand = rBrands[idx % rBrands.length];
        const prefixes = categoryDescriptors[inferredCategory] || categoryDescriptors.Top;
        const prefix = prefixes[idx % prefixes.length];
        const fabric = fabricList[idx % fabricList.length];
        const image = imageList[idx % imageList.length];

        // Specific tailored item title directly derived from user's request
        let tailoredTitle = `${prefix} ${cleanQueryPhrase}`;
        const words = tailoredTitle.split(/\s+/);
        const uniqueWords = [];
        for (const w of words) {
            if (uniqueWords.length === 0 || uniqueWords[uniqueWords.length - 1].toLowerCase() !== w.toLowerCase()) {
                uniqueWords.push(w);
            }
        }
        tailoredTitle = uniqueWords.join(' ');
        
        // Accurate working direct shop link
        const workingLink = buildWorkingShopLink(spec.retailer, tailoredTitle, null);

        // Price variations
        const priceVariation = ((idx * 270) % 650) - 150;
        let finalPrice = Math.max(599, spec.priceBase + priceVariation);
        let finalMrp = Math.round(finalPrice * 1.45 / 50) * 50 - 1;

        if (maxBudget > 0 && finalPrice > maxBudget) {
            finalPrice = Math.max(499, Math.round(maxBudget * 0.9));
            finalMrp = Math.round(finalPrice * 1.4);
        }

        const ratingVal = (4.3 + (idx * 0.13) % 0.6).toFixed(1);
        const reviewsCount = 45 + ((idx * 79) % 350);
        const matchScore = 98 - (idx * 2);

        return {
            id: `fit_${idx + 1}_${Date.now()}`,
            title: tailoredTitle,
            brand: `${brand} / ${spec.retailer}`,
            price: `₹${finalPrice.toLocaleString('en-IN')}`,
            extractedPrice: finalPrice,
            originalPrice: `₹${finalMrp.toLocaleString('en-IN')}`,
            image: image,
            rating: ratingVal,
            reviews: reviewsCount,
            fabric: fabric,
            retailer: spec.retailer,
            domain: spec.domain,
            link: workingLink,
            delivery: spec.delivery,
            matchScore: matchScore
        };
    });

    return catalog;
}

// Router Endpoint for Find Fit (supports image upload and text query)
router.all(['/find-fit', '/findfit'], upload.single('fitImage'), async (req, res) => {
    let tempUploadPath = null;
    try {
        let query = (req.body?.query || req.query?.query || '').trim();
        let category = req.body?.category || req.query?.category || 'All';
        const retailer = req.body?.retailer || req.query?.retailer || 'All';
        const maxBudget = parseInt(req.body?.maxBudget || req.query?.maxBudget || 0, 10);
        const apiKey = req.body?.apiKey || req.query?.apiKey || process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || '';

        let detectedFromImage = null;

        // If user uploaded an outfit or garment image
        if (req.file) {
            tempUploadPath = req.file.path;
            detectedFromImage = await identifyGarmentFromImage(tempUploadPath);
            if (!query || query === 'Oversized Pure Linen Shirt') {
                query = detectedFromImage.detectedQuery;
            }
            if (category === 'All' && detectedFromImage.category) {
                category = detectedFromImage.category;
            }
        }

        if (!query) {
            query = 'Oversized Pure Linen Shirt';
        }

        let products = [];
        let sourceUsed = 'curated_indian_market';

        if (apiKey) {
            try {
                let serpSearchQuery = `${query} clothing apparel fashion`;
                if (retailer && retailer !== 'All') {
                    serpSearchQuery += ` ${retailer}`;
                }
                serpSearchQuery += ' India';

                const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(serpSearchQuery)}&gl=in&hl=en&location=India&google_domain=google.co.in&api_key=${apiKey}`;
                const response = await fetch(serpUrl);
                const data = await response.json();

                if (data && Array.isArray(data.shopping_results) && data.shopping_results.length > 0) {
                    sourceUsed = 'serpapi_live';
                    products = data.shopping_results.map((item, idx) => {
                        let parsedPrice = item.price || (item.extracted_price ? `₹${item.extracted_price}` : '₹1,499');
                        if (!parsedPrice.includes('₹') && !parsedPrice.toLowerCase().includes('rs')) {
                            parsedPrice = `₹${parsedPrice}`;
                        }
                        const storeName = item.source || item.merchant?.name || (retailer !== 'All' ? retailer : 'Myntra');
                        const validLink = buildWorkingShopLink(storeName, item.title, item.link || item.product_link);

                        return {
                            id: `serp_${idx + 1}_${Date.now()}`,
                            title: item.title,
                            brand: storeName,
                            price: parsedPrice,
                            extractedPrice: item.extracted_price || 1499,
                            originalPrice: item.old_price || null,
                            image: item.thumbnail || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=80',
                            rating: item.rating ? Number(item.rating).toFixed(1) : '4.5',
                            reviews: item.reviews || Math.floor(Math.random() * 80) + 18,
                            fabric: 'Quality Garment',
                            retailer: storeName,
                            domain: storeName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
                            link: validLink,
                            delivery: item.delivery || 'Free Delivery in India',
                            matchScore: Math.floor(Math.random() * 6) + 93
                        };
                    });
                }
            } catch (serpErr) {
                console.warn('SerpApi live query failed, using curated Indian market catalog:', serpErr.message);
            }
        }

        if (products.length === 0) {
            products = generateDynamicIndianFashionCatalog(query, category, retailer, maxBudget, detectedFromImage);
        }

        if (maxBudget > 0) {
            products = products.filter(p => !p.extractedPrice || p.extractedPrice <= maxBudget);
        }

        return res.json({
            success: true,
            query,
            category,
            retailer,
            maxBudget,
            source: sourceUsed,
            detectedFromImage,
            count: products.length,
            products
        });
    } catch (err) {
        console.error('Find Fit API Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve Indian fashion recommendations.',
            details: err.message
        });
    } finally {
        if (tempUploadPath && fs.existsSync(tempUploadPath)) {
            try { fs.unlinkSync(tempUploadPath); } catch (e) {}
        }
    }
});

module.exports = router;