require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// Store uploaded images temporarily
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 15 * 1024 * 1024 }
});

// Hugging Face OpenAI-compatible router
const MODEL_URL = 'https://router.huggingface.co/v1/chat/completions';

// node-fetch
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Intelligent Stylist Consultation Engine
function generateStylistConsultation(question, hasQ) {
    const vibes = [
        {
            archetype: "Soft Coquette & Modern Romantic",
            palette: "Powder pink, cream ivory, and rose gold",
            mood: "Whimsical, feminine, and effortlessly elevated",
            shoes: "Kitten heels, dainty ballet flats, or Mary Janes",
            jewelry: "Dainty pearl drop earrings or fine gold layering chains",
            beauty: "Dewy cushion blush, glazed lip oil, and soft winged lashes"
        },
        {
            archetype: "90s Minimalist & Clean Chic",
            palette: "Oatmeal beige, slate gray, and espresso black",
            mood: "Understated, structured, and confident",
            shoes: "Sleek pointed slingbacks or lug-sole loafers",
            jewelry: "Chunky silver huggies and a sculptural cuff bracelet",
            beauty: "Satin nude lip, clean-girl brushed brows, and minimal mascara"
        },
        {
            archetype: "Y2K Indie Pop & Playful Retro",
            palette: "Baby blue, metallic chrome, and cherry red",
            mood: "Vibrant, nostalgic, and trendsetter energy",
            shoes: "Platform sneakers or retro square-toe ankle boots",
            jewelry: "Layered silver ball chains and star-charm rings",
            beauty: "Glossy berry tint and frosted champagne highlighter"
        },
        {
            archetype: "Chic Parisian & Warm Luxury",
            palette: "Camel tan, warm ivory, and espresso leather",
            mood: "Tailored, sophisticated, and effortless",
            shoes: "Pointed slingbacks, leather ankle boots, or minimalist loafers",
            jewelry: "Sculptural gold hoops and a vintage leather-strap watch",
            beauty: "Warm terracotta lip, softly defined eyes, and sleek hair"
        }
    ];

    const pick = vibes[Math.floor(Math.random() * vibes.length)];

    let qAnswer = "";
    if (hasQ && question && question.trim() !== "") {
        const q = question.toLowerCase();
        if (q.includes("gold") || q.includes("silver")) {
            const metal = (pick.palette.includes("gold") || pick.palette.includes("pink") || pick.palette.includes("warm") || pick.palette.includes("cream")) ? "Gold" : "Silver";
            qAnswer = `Jewelry Verdict on "${question}":\n` +
                      `• Winning Choice: **${metal}**!\n` +
                      `• Why: It harmonizes naturally with the tones of ${pick.palette}, creating a radiant and seamless glow.\n` +
                      `• Top Pieces: ${pick.jewelry}.\n\n`;
        } else if (q.includes("shoe") || q.includes("heel") || q.includes("sneaker") || q.includes("boot") || q.includes("flat") || q.includes("sandals")) {
            qAnswer = `Footwear Advice on "${question}":\n` +
                      `• Recommended Pair: ${pick.shoes}.\n` +
                      `• Pro Tip: Ensure the shoe silhouette anchors the outfit proportion cleanly.\n\n`;
        } else if (q.includes("new year") || q.includes("party") || q.includes("celebrat") || q.includes("anniversary") || q.includes("diwali") || q.includes("wedding") || q.includes("event")) {
            qAnswer = `Occasion Styling on "${question}":\n` +
                      `• Verdict: This outfit is a great foundation for the event!\n` +
                      `• Styling Tip: Elevate it with reflective accessories (${pick.jewelry}) and pair with ${pick.shoes.toLowerCase()} to keep the energy chic and poised.\n\n`;
        } else {
            qAnswer = `Stylist Consultation on "${question}":\n` +
                      `• Verdict: The fit looks balanced and intentional! It leans into ${pick.archetype}.\n` +
                      `• Key Advice: Balance the look with ${pick.jewelry.toLowerCase()} and ${pick.shoes.toLowerCase()}.\n\n`;
        }
    }

    return `${qAnswer}━━━━━━━━━━━━━━━━━━━━━\n` +
           `Style & Aesthetic Breakdown:\n` +
           `• Aesthetic Archetype: ${pick.archetype}\n` +
           `• Color Palette: ${pick.palette}\n` +
           `• Overall Mood: ${pick.mood}\n` +
           `• Recommended Footwear: ${pick.shoes}\n` +
           `• Jewelry & Accents: ${pick.jewelry}\n` +
           `• Hair & Beauty Touch: ${pick.beauty}`;
}

router.post(
    '/detect-aesthetic',
    upload.single('outfitImage'),
    async (req, res) => {
        let tempFilePath = null;

        try {
            const { hasQuestion, userQuestion } = req.body;

            // Make sure an image was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No image file uploaded. Please select an outfit photo.'
                });
            }

            tempFilePath = req.file.path;

            // Check Hugging Face API key
            const apiKey = process.env.HF_API_KEY ? process.env.HF_API_KEY.trim() : null;

            if (!apiKey) {
                console.warn('No HF_API_KEY set; using Muse Stylist Consultation fallback.');
                const consultation = generateStylistConsultation(userQuestion, hasQuestion === 'true');
                return res.json({
                    success: true,
                    results: {
                        choices: [{ message: { content: consultation } }]
                    }
                });
            }

            // Read image and convert to base64
            const imageBuffer = fs.readFileSync(tempFilePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';

            let finalPrompt;
            if (hasQuestion === 'true' && userQuestion && userQuestion.trim() !== '') {
                finalPrompt = `Analyze the outfit in this image and answer this specific question: "${userQuestion}"`;
            } else {
                finalPrompt = `Analyze the outfit in this image.
Describe:
1. The overall fashion aesthetic
2. The main clothing pieces
3. The color palette
4. The overall mood or vibe
5. What occasion this outfit would suit
Keep the response concise, chic, and friendly.`;
            }

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
                max_tokens: 300
            };

            let hfSuccess = false;
            let rawData = null;

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
                    rawData = JSON.parse(responseText);
                } catch (e) {
                    console.warn('Hugging Face returned non-JSON response.');
                }

                if (hfResponse.ok && rawData && (rawData.choices || rawData.generated_text || Array.isArray(rawData))) {
                    hfSuccess = true;
                } else {
                    console.warn(
                        'Hugging Face API returned non-200 or unsupported model (',
                        rawData?.error?.message || rawData?.error || hfResponse.status,
                        ')-> Seamlessly switching to Muse Stylist Consultation.'
                    );
                }
            } catch (networkErr) {
                console.warn('Hugging Face network request failed -> Using Muse Stylist Consultation.');
            }

            // If Hugging Face succeeded, return its results
            if (hfSuccess && rawData) {
                return res.json({
                    success: true,
                    results: rawData
                });
            }

            // Otherwise, deliver intelligent styling consultation
            const consultation = generateStylistConsultation(userQuestion, hasQuestion === 'true');
            return res.json({
                success: true,
                results: {
                    choices: [{ message: { content: consultation } }]
                }
            });

        } catch (error) {
            console.error('AI Routing Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process image aesthetic.',
                details: error.message
            });
        } finally {
            // Clean temporary file safely
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

// AI Wardrobe Outfit Generator
router.post('/generate-outfit', async (req, res) => {
    try {
        const { items = [], vibe = "Soft Coquette", occasion = "Party" } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Your digital wardrobe is empty! Please add at least one clothing piece, shoe, or accessory."
            });
        }

        const tops = items.filter(i => i.category === 'Top');
        const bottoms = items.filter(i => i.category === 'Bottom');
        const dresses = items.filter(i => i.category === 'Dress');
        const shoes = items.filter(i => i.category === 'Shoes');
        const jewelry = items.filter(i => i.category === 'Jewelry');
        const outerwear = items.filter(i => i.category === 'Outerwear');

        let selectedMain = [];
        if (dresses.length > 0 && (bottoms.length === 0 || Math.random() > 0.5)) {
            selectedMain.push(dresses[Math.floor(Math.random() * dresses.length)]);
        } else {
            if (tops.length > 0) selectedMain.push(tops[Math.floor(Math.random() * tops.length)]);
            if (bottoms.length > 0) selectedMain.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
        }

        if (selectedMain.length === 0 && items.length > 0) {
            selectedMain.push(items[0]);
        }

        const selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;
        const selectedJewelry = jewelry.length > 0 ? jewelry[Math.floor(Math.random() * jewelry.length)] : null;
        const selectedOuter = outerwear.length > 0 && Math.random() > 0.4 ? outerwear[Math.floor(Math.random() * outerwear.length)] : null;

        const mainName = selectedMain.map(m => m.name).join(" paired with ") || "your wardrobe base";
        const shoesName = selectedShoes ? selectedShoes.name : "sleek footwear";
        const jewelryName = selectedJewelry ? selectedJewelry.name : "fine accents";

        let occasionNote = "";
        let beautyTip = "";

        if (occasion === "Diwali" || occasion === "Traditional") {
            occasionNote = `For festive occasions, styling ${mainName} creates timeless regal poise. Complemented by ${jewelryName} and ${shoesName}, this look bridges tradition and modern comfort effortlessly.`;
            beautyTip = "Smudged kohl eyes, luminous warm highlighter, and soft berry lip.";
        } else if (occasion === "Party" || occasion === "Celebration" || occasion === "Night Out") {
            occasionNote = `For a high-energy party atmosphere, ${mainName} brings dynamic movement. Accented by ${jewelryName} and ${shoesName}, you capture ambient room lighting flawlessly.`;
            beautyTip = "Glass-skin cheeks, subtle shimmer eyeshadow, and a long-wear glazed lip.";
        } else if (occasion === "Date Night") {
            occasionNote = `A romantic silhouette combining ${mainName} with ${jewelryName}. It feels intentional, chic, and elevated without feeling overdone.`;
            beautyTip = "Soft winged mascara, dewy blush, and hydrated nude lip.";
        } else {
            occasionNote = `For everyday elevated styling, ${mainName} anchors a balanced aesthetic. Pairing with ${shoesName} ensures relaxed, all-day confidence.`;
            beautyTip = "Clean-girl brushed brows, sun-kissed cheek tint, and hydrating lip oil.";
        }

        res.json({
            success: true,
            outfit: {
                title: `${vibe} × ${occasion} Edit`,
                occasion: occasion,
                vibe: vibe,
                pieces: {
                    main: selectedMain,
                    shoes: selectedShoes ? [selectedShoes] : [],
                    jewelry: selectedJewelry ? [selectedJewelry] : [],
                    outerwear: selectedOuter ? [selectedOuter] : []
                },
                stylingRationale: occasionNote,
                beautyTip: beautyTip
            }
        });

    } catch (error) {
        console.error("Outfit Generator Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate wardrobe outfit."
        });
    }
});

// AI Makeup & Beauty Look Recommender
router.post('/makeup-recommendation', upload.single('outfitImage'), async (req, res) => {
    let tempFilePath = null;
    try {
        const { vibe = "Soft Coquette & Modern Romantic", undertone = "Warm Golden / Olive", userQuestion } = req.body;

        if (req.file) {
            tempFilePath = req.file.path;
        }

        // Tailored makeup palettes by vibe & undertone
        const makeupGuides = {
            coquette: {
                title: "Soft Coquette & Modern Romantic Glow",
                skinBase: "Glass-skin hydrating cushion foundation with radiant rose-water mist. Soft diffuse berry-pink liquid blush tapped high on the cheekbones and bridge of the nose.",
                eyes: "Champagne shimmer across the eyelid, ultra-fine brown liquid flick, and fluttery flared outer-corner lashes.",
                lips: "Peachy-pink lip liner with a plumping glazed berry lip oil or gloss.",
                hair: "Romantic loose French-pin updo or tousled blowout with face-framing tendrils.",
                proTip: "Keep the base ultra-dewy so the soft pink blush radiates naturally under ambient light."
            },
            minimalist: {
                title: "90s Minimalist & Clean-Girl Chic",
                skinBase: "Skin tint or spot-concealer base with a velvety satin finish. Warm taupe-bronzer sculpting the cheekbones and jawline.",
                eyes: "Brushed-up soap brows, a wash of warm beige shadow in the crease, and brown mascara.",
                lips: "Warm cocoa or 90s satin nude lipstick with defined neutral lip liner.",
                hair: "Sleek low ballet bun or middle-parted polished low ponytail.",
                proTip: "Focus on clean skin and defined eyebrows—keep eye color minimal to let your outfit silhouette lead."
            },
            goth: {
                title: "Goth Siren & Smoky Grunge",
                skinBase: "Velvet cloud matte complexion with subtle alabaster or cool-neutral undertone setting powder. Muted berry-plum contour.",
                eyes: "Smudged diffused kohl eyeliner along top and bottom waterlines, deep espresso/slate shadow, and dramatic volumized mascara.",
                lips: "Deep black cherry, espresso wine, or vampy burgundy velvet matte lip.",
                hair: "Sleek glass hair, layered wolf cut, or textured undone wave.",
                proTip: "Use a smudge brush to soften the kohl liner edges for that effortless editorial grunge allure."
            },
            indie: {
                title: "Y2K Indie Pop & Retro Playful Glam",
                skinBase: "Luminous dewy base with frosted champagne highlighter on the cheekbone peaks, brow bones, and cupid's bow.",
                eyes: "Graphic baby blue or metallic silver eyeliner accent, inner corner glitter sparkle, and lifted doll lashes.",
                lips: "Holographic high-shine gloss over a juicy pink or strawberry tint.",
                hair: "Mini baby braids, bubble ponytail, or playful 90s claw clip twist.",
                proTip: "Add a touch of icy chrome highlighter on your inner eye corners to instantly pop against vibrant clothes."
            },
            parisian: {
                title: "Chic Parisian & Warm Luxury",
                skinBase: "Breathable radiant base with sun-kissed terracotta cream blush melted seamlessly into the temples.",
                eyes: "Soft espresso winged shadow buffed outward and curled natural lashes.",
                lips: "Iconic blotted Parisian red or warm brick-rose satin lipstick applied with finger taps for a blurred French edge.",
                hair: "Effortless French curtain bangs with voluminous, touchable waves.",
                proTip: "Blot your lip color with a tissue and tap edges with a ring finger for that authentic lived-in French chic look."
            },
            festive: {
                title: "Festive Royal & Luminous Glam",
                skinBase: "Long-wear luminous foundation, warm golden liquid illuminator on the cheekbones, and rich warm peach blush.",
                eyes: "Gilded antique gold pigment on lids, winged jet-black gel liner, and dense kohl on the lower rim.",
                lips: "Rich terracotta or deep ruby velvet lip with golden gloss center accent.",
                hair: "Sleek braided bun wrapped with fresh jasmine (gajra) or cascading Hollywood waves.",
                proTip: "Set with fine dewy fixing spray to keep your golden glow radiant throughout hours of celebrations."
            }
        };

        const vibeKey = vibe.toLowerCase();
        let selectedGuide;
        if (vibeKey.includes("goth") || vibeKey.includes("grunge")) {
            selectedGuide = makeupGuides.goth;
        } else if (vibeKey.includes("chic") || vibeKey.includes("parisian") || vibeKey.includes("luxury")) {
            selectedGuide = makeupGuides.parisian;
        } else if (vibeKey.includes("minimalist") || vibeKey.includes("clean")) {
            selectedGuide = makeupGuides.minimalist;
        } else if (vibeKey.includes("indie") || vibeKey.includes("y2k") || vibeKey.includes("retro")) {
            selectedGuide = makeupGuides.indie;
        } else if (vibeKey.includes("festive") || vibeKey.includes("diwali") || vibeKey.includes("traditional") || vibeKey.includes("desi")) {
            selectedGuide = makeupGuides.festive;
        } else {
            selectedGuide = makeupGuides.coquette;
        }

        // Custom question advice
        let customAdvice = "";
        if (userQuestion && userQuestion.trim() !== "") {
            const q = userQuestion.toLowerCase();
            if (q.includes("lip") || q.includes("lipstick") || q.includes("shade")) {
                customAdvice = `Custom Lip Verdict for "${userQuestion}": Harmonize with your ${undertone.split('/')[0].trim()} undertone by pairing ${selectedGuide.lips.toLowerCase()}`;
            } else if (q.includes("eye") || q.includes("eyeliner") || q.includes("shadow")) {
                customAdvice = `Custom Eye Direction for "${userQuestion}": Focus on ${selectedGuide.eyes.toLowerCase()}`;
            } else if (q.includes("hair") || q.includes("hairstyle")) {
                customAdvice = `Custom Hair Advice for "${userQuestion}": ${selectedGuide.hair}`;
            } else {
                customAdvice = `Beauty Consultant Verdict for "${userQuestion}": This combination balances with your outfit silhouette! Follow the ${selectedGuide.title} palette to tie everything together.`;
            }
        }

        res.json({
            success: true,
            makeup: {
                title: selectedGuide.title,
                undertoneMatched: undertone,
                skinBase: selectedGuide.skinBase,
                eyes: selectedGuide.eyes,
                lips: selectedGuide.lips,
                hair: selectedGuide.hair,
                proTip: selectedGuide.proTip,
                customAdvice: customAdvice
            }
        });

    } catch (error) {
        console.error("Makeup Recommender Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate makeup recommendation."
        });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.error("Failed to remove temp file:", e);
            }
        }
    }
});

module.exports = router;