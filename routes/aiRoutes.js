require('dotenv').config(); 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// Configure multer to temporarily store uploaded files into an 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// STABLE FIX: Swapped to the open public Llama 3.2 Vision model endpoint
const MODEL_URL = "https://huggingface.co";
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// The upload.single('outfitImage') middleware processes the file upload automatically
router.post('/detect-aesthetic', upload.single('outfitImage'), async (req, res) => {
    let tempFilePath = null;
    try {
        // Extract form strings instead of 'imageUrl'
        const { hasQuestion, userQuestion } = req.body; 
        
        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }

        tempFilePath = req.file.path;

        // Convert local temporary physical image file straight into base64 text strings
        const imageBuffer = fs.readFileSync(tempFilePath);
        const base64Image = imageBuffer.toString('base64');

        // Set prompt instructions dynamically
        let finalPrompt;
        if (hasQuestion === "true" && userQuestion && userQuestion.trim() !== "") {
            finalPrompt = `Analyze the outfit in this image and answer this specific question: "${userQuestion}"`;
        } else {
            finalPrompt = "Analyze the outfit in this image. Describe its general fashion vibe, aesthetic style (e.g., Goth, Chic, Y2K, Minimalist), and overall mood in a few clean sentences.";
        }

        // Build payload configuration matching the public vision model architecture
        const payload = {
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: finalPrompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            parameters: { max_new_tokens: 300 }
        };

        // Query Hugging Face servers
        const hfResponse = await fetch(MODEL_URL, {
            headers: { 
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(payload),
        });

        // Safe text capture block to catch HTML pages before they crash JSON parsing
        const responseText = await hfResponse.text();
        let rawData;
        
        try {
            rawData = JSON.parse(responseText);
        } catch (e) {
            console.log("\n⚠️ --- HUGGING FACE returned a web page instead of data! ---");
            console.log("Check if your Token is correct or if the model is loading.");
            console.log("Short view of the page:", responseText.substring(0, 300));
            
            // Clean up file even if it errors out
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            return res.status(500).json({ error: "Hugging Face endpoint returned an HTML error screen." });
        }

        // Clean up: delete the temporary uploaded file from your hard drive safely
        fs.unlinkSync(tempFilePath);

        res.json({
            success: true,
            results: rawData
        });

    } catch (error) {
        console.error("AI Routing Error:", error);
        // Ensure cleanup happens even if execution crashes midway
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        res.status(500).json({ error: "Failed to process image aesthetic." });
    }
});

module.exports = router;
