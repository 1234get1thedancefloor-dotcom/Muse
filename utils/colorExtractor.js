// ============================================================
// HIGH-PRECISION COLOR EXTRACTOR (BACKGROUND & SKIN AWARE)
// Extracts true garment colors while stripping out background & skin.
// ============================================================

const sharp = require("sharp");

// ============================================================
// FASHION COLOR DICTIONARY (WITH ACCURATE RGB ANCHORS)
// ============================================================

const FASHION_COLORS = [
    // Neutrals & Monochromes
    { name: "Jet Black", hex: "#111111", rgb: [17, 17, 17] },
    { name: "Charcoal Grey", hex: "#36454F", rgb: [54, 69, 79] },
    { name: "Slate Grey", hex: "#708090", rgb: [112, 128, 144] },
    { name: "Heather Grey", hex: "#A9A9A9", rgb: [169, 169, 169] },
    { name: "Crisp White", hex: "#FFFFFF", rgb: [255, 255, 255] },
    { name: "Ivory Cream", hex: "#FFFFF0", rgb: [255, 255, 240] },
    { name: "Warm Beige", hex: "#F5F5DC", rgb: [245, 245, 220] },
    { name: "Oatmeal", hex: "#E3DAC9", rgb: [227, 218, 201] },
    { name: "Camel Tan", hex: "#C19A6B", rgb: [193, 154, 107] },
    { name: "Taupe", hex: "#483C32", rgb: [72, 60, 50] },

    // Browns & Earth Tones
    { name: "Espresso Brown", hex: "#4A2E18", rgb: [74, 46, 24] },
    { name: "Chocolate Brown", hex: "#3D2314", rgb: [61, 35, 20] },
    { name: "Warm Chestnut", hex: "#8B4513", rgb: [139, 69, 19] },
    { name: "Terracotta", hex: "#CC4E33", rgb: [204, 78, 51] },
    { name: "Rust", hex: "#B7410E", rgb: [183, 65, 14] },

    // Reds & Burgundies
    { name: "Crimson Red", hex: "#E60023", rgb: [230, 0, 35] },
    { name: "Deep Burgundy", hex: "#800020", rgb: [128, 0, 32] },
    { name: "Cherry Wine", hex: "#6E0B23", rgb: [110, 11, 35] },
    { name: "Maroon", hex: "#800000", rgb: [128, 0, 0] },
    { name: "Coral", hex: "#FF7F50", rgb: [255, 127, 80] },

    // Pinks & Pastels
    { name: "Blush Pink", hex: "#DE5D83", rgb: [222, 93, 131] },
    { name: "Powder Pink", hex: "#F4C2C2", rgb: [244, 194, 194] },
    { name: "Dusty Rose", hex: "#DCAE96", rgb: [220, 174, 150] },
    { name: "Hot Pink", hex: "#FF69B4", rgb: [255, 105, 180] },

    // Blues
    { name: "Baby Blue", hex: "#89CFF0", rgb: [137, 207, 240] },
    { name: "Sky Blue", hex: "#87CEEB", rgb: [135, 206, 235] },
    { name: "Denim Blue", hex: "#2B4C7E", rgb: [43, 76, 126] },
    { name: "Royal Navy", hex: "#000080", rgb: [0, 0, 128] },
    { name: "Midnight Navy", hex: "#1B263B", rgb: [27, 38, 59] },
    { name: "Cobalt Blue", hex: "#0047AB", rgb: [0, 71, 171] },
    { name: "Turquoise", hex: "#40E0D0", rgb: [64, 224, 208] },

    // Greens
    { name: "Sage Green", hex: "#87A987", rgb: [135, 169, 135] },
    { name: "Olive Khaki", hex: "#556B2F", rgb: [85, 107, 47] },
    { name: "Forest Pine", hex: "#228B22", rgb: [34, 139, 34] },
    { name: "Emerald Green", hex: "#046307", rgb: [4, 99, 7] },
    { name: "Mint Green", hex: "#98FF98", rgb: [152, 255, 152] },

    // Yellows & Golds
    { name: "Mustard Gold", hex: "#E1AD01", rgb: [225, 173, 1] },
    { name: "Warm Gold", hex: "#D4AF37", rgb: [212, 175, 55] },
    { name: "Burnished Silver", hex: "#C0C0C0", rgb: [192, 192, 192] },

    // Purples & Lilacs
    { name: "Pastel Lilac", hex: "#C8A2C8", rgb: [200, 162, 200] },
    { name: "Lavender", hex: "#E6E6FA", rgb: [230, 230, 250] },
    { name: "Royal Plum", hex: "#4E1643", rgb: [78, 22, 67] }
];

function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map(value =>
                Math.max(0, Math.min(255, Math.round(value)))
                    .toString(16)
                    .padStart(2, "0")
            )
            .join("")
            .toUpperCase()
    );
}

function perceptualColorDistance(rgb1, rgb2) {
    const rmean = (rgb1[0] + rgb2[0]) / 2;
    const dr = rgb1[0] - rgb2[0];
    const dg = rgb1[1] - rgb2[1];
    const db = rgb1[2] - rgb2[2];
    return Math.sqrt(
        (((512 + rmean) * dr * dr) >> 8) +
        4 * dg * dg +
        (((767 - rmean) * db * db) >> 8)
    );
}

function findClosestFashionColor(rgb) {
    let closest = FASHION_COLORS[0];
    let smallestDistance = Infinity;

    for (const color of FASHION_COLORS) {
        const distance = perceptualColorDistance(rgb, color.rgb);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            closest = color;
        }
    }
    return closest;
}

// Check if RGB matches typical human skin tones
function isSkinTone(r, g, b) {
    if (r > 135 && g > 75 && b > 55 && r > g && g > b) {
        if ((r - b) > 28 && (g - b) > 10) {
            return true;
        }
    }
    return false;
}

// ============================================================
// EXTRACT DOMINANT COLORS
// ============================================================

async function extractColors(imagePath) {
    if (!imagePath) {
        throw new Error("No image path provided to extractColors().");
    }

    const { data, info } = await sharp(imagePath)
        .resize(200, 200, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // 1. Learn Background Perimeter Profile from outer border
    const backgroundAnchors = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isBorder = (x < width * 0.12 || x > width * 0.88 || y < height * 0.12 || y > height * 0.92);
            if (isBorder) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                if (a > 150) {
                    const isUnique = backgroundAnchors.every(ba => perceptualColorDistance([r, g, b], ba) > 25);
                    if (isUnique && backgroundAnchors.length < 10) {
                        backgroundAnchors.push([r, g, b]);
                    }
                }
            }
        }
    }

    // 2. Sample Central Body / Torso Region (where clothes reside)
    const colorBins = new Map();
    let validPixelCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Ignore transparent pixels from segmentation mask
            if (a < 128) continue;

            // Focus on central 70% width and middle 75% height
            const isTorsoRegion = (x >= width * 0.15 && x <= width * 0.85 && y >= height * 0.14 && y <= height * 0.88);
            if (!isTorsoRegion) continue;

            // Reject pixels matching background perimeter colors
            const isBackground = backgroundAnchors.some(ba => perceptualColorDistance([r, g, b], ba) < 32);
            if (isBackground && backgroundAnchors.length > 0) continue;

            // Reject skin tones
            if (isSkinTone(r, g, b)) continue;

            // Quantize into bins (step=24)
            const qr = Math.round(r / 24) * 24;
            const qg = Math.round(g / 24) * 24;
            const qb = Math.round(b / 24) * 24;
            const key = `${qr},${qg},${qb}`;

            const existing = colorBins.get(key) || { rSum: 0, gSum: 0, bSum: 0, count: 0 };
            existing.rSum += r;
            existing.gSum += g;
            existing.bSum += b;
            existing.count++;
            colorBins.set(key, existing);
            validPixelCount++;
        }
    }

    // Fallback: If torso filter was too strict (e.g. monochromatic white/black dress), re-sample torso without skin filter
    if (validPixelCount < 50) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a < 128) continue;
                const isTorso = (x >= width * 0.20 && x <= width * 0.80 && y >= height * 0.18 && y <= height * 0.82);
                if (!isTorso) continue;

                const qr = Math.round(r / 24) * 24;
                const qg = Math.round(g / 24) * 24;
                const qb = Math.round(b / 24) * 24;
                const key = `${qr},${qg},${qb}`;

                const existing = colorBins.get(key) || { rSum: 0, gSum: 0, bSum: 0, count: 0 };
                existing.rSum += r;
                existing.gSum += g;
                existing.bSum += b;
                existing.count++;
                colorBins.set(key, existing);
                validPixelCount++;
            }
        }
    }

    if (validPixelCount === 0) {
        return [{ name: "Crisp White", hex: "#FFFFFF", percentage: 100 }];
    }

    // 3. Cluster and extract dominant colors
    const sortedBins = Array.from(colorBins.values()).sort((a, b) => b.count - a.count);
    const distinctColors = [];

    for (const bin of sortedBins) {
        const percentage = (bin.count / validPixelCount) * 100;
        if (percentage < 2.5 && distinctColors.length >= 2) continue;

        const avgR = Math.round(bin.rSum / bin.count);
        const avgG = Math.round(bin.gSum / bin.count);
        const avgB = Math.round(bin.bSum / bin.count);

        const isDuplicate = distinctColors.some(existing => {
            return perceptualColorDistance([avgR, avgG, avgB], existing.rgb) < 30;
        });

        if (!isDuplicate || distinctColors.length === 0) {
            const closest = findClosestFashionColor([avgR, avgG, avgB]);
            const exactHex = rgbToHex(avgR, avgG, avgB);

            distinctColors.push({
                name: closest.name,
                hex: exactHex,
                rgb: [avgR, avgG, avgB],
                percentage: Number(percentage.toFixed(1))
            });
        }

        if (distinctColors.length >= 4) break;
    }

    // Normalize percentages to 100%
    const totalPercentage = distinctColors.reduce((sum, c) => sum + c.percentage, 0);
    if (totalPercentage > 0) {
        distinctColors.forEach(c => {
            c.percentage = Number(((c.percentage / totalPercentage) * 100).toFixed(1));
        });
    }

    console.log("🎨 Precision Clothing Palette:", distinctColors);
    return distinctColors;
}

module.exports = {
    extractColors,
    findClosestFashionColor,
    perceptualColorDistance,
    rgbToHex
};