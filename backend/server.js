const express = require("express");

const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Muse backend is running!" });
});
app.post("/outfits", (req, res) => {
    const { occasion, vibe } = req.body;

    let outfits;

    if (occasion === "college" && vibe === "casual") {
        outfits = [
            {
                top: "Oversized white T-shirt",
                bottom: "Blue straight-fit jeans",
                shoes: "White sneakers",
                accessory: "Minimal tote bag"
            },
            {
                top: "Black fitted T-shirt",
                bottom: "Beige cargo pants",
                shoes: "White sneakers",
                accessory: "Simple watch"
            },
            {
                top: "Oversized blue shirt",
                bottom: "Black straight-fit jeans",
                shoes: "Canvas sneakers",
                accessory: "Crossbody bag"
            }
        ];

    } else if (occasion === "party" && vibe === "trendy") {
        outfits = [
            {
                top: "Black statement top",
                bottom: "Wide-leg trousers",
                shoes: "Platform sneakers",
                accessory: "Statement earrings"
            },
            {
                top: "Satin shirt",
                bottom: "Black jeans",
                shoes: "Ankle boots",
                accessory: "Small shoulder bag"
            },
            {
                top: "Graphic top",
                bottom: "Cargo pants",
                shoes: "Chunky sneakers",
                accessory: "Layered necklace"
            }
        ];

    } else if (occasion === "college" && vibe === "formal") {
        outfits = [
            {
                top: "White button-up shirt",
                bottom: "Black trousers",
                shoes: "Loafers",
                accessory: "Simple watch"
            },
            {
                top: "Pastel blouse",
                bottom: "Straight-fit trousers",
                shoes: "Flats",
                accessory: "Tote bag"
            },
            {
                top: "Blazer over basic top",
                bottom: "Black trousers",
                shoes: "Loafers",
                accessory: "Minimal necklace"
            }
        ];

    } else {
        outfits = [
            {
                top: "Basic black top",
                bottom: "Blue jeans",
                shoes: "Sneakers",
                accessory: "Simple watch"
            }
        ];
    }

    res.json({
        message: "Here are your Muse outfit options!",
        occasion: occasion,
        vibe: vibe,
        outfits: outfits
    });
});



app.listen(PORT, () => {
    console.log(`Muse server running on http://localhost:3001`);
});