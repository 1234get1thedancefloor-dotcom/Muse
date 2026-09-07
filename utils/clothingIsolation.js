const sharp = require("sharp");
const { pipeline, env } = require("@huggingface/transformers");

// Configure transformers environment
env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_NAME = "Xenova/segformer_b2_clothes";

let segmenterInstance = null;
let segmenterLoadingPromise = null;

async function getSegmenter() {
    if (segmenterInstance) return segmenterInstance;
    if (segmenterLoadingPromise) return segmenterLoadingPromise;

    segmenterLoadingPromise = (async () => {
        try {
            console.log("👗 Initializing Xenova/segformer_b2_clothes segmentation pipeline...");
            segmenterInstance = await pipeline("image-segmentation", MODEL_NAME);
            console.log("✅ SegFormer clothing segmentation pipeline ready");
            return segmenterInstance;
        } catch (err) {
            console.warn("⚠️ SegFormer model loading notice:", err.message);
            segmenterLoadingPromise = null;
            return null;
        }
    })();

    return segmenterLoadingPromise;
}

const NON_CLOTHING_LABELS = new Set([
    "background",
    "hair",
    "face",
    "left-arm",
    "right-arm",
    "left-leg",
    "right-leg",
    "skin",
    "head"
]);

function isClothing(label) {
    if (!label) return false;
    const clean = String(label).toLowerCase().replace(/[\s_]+/g, "-").trim();
    return !NON_CLOTHING_LABELS.has(clean);
}

// =====================================================
// SALIENT TORSO & OUTFIT CROPPER (FALLBACK & PRE-FILTER)
// =====================================================

async function createSalientOutfitCrop(imagePath, outputPath) {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Crop the central 70% width and middle 75% height where clothing is located
    const cropLeft = Math.floor(width * 0.15);
    const cropTop = Math.floor(height * 0.15);
    const cropWidth = Math.max(10, Math.floor(width * 0.70));
    const cropHeight = Math.max(10, Math.floor(height * 0.75));

    await sharp(imagePath)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .png()
        .toFile(outputPath);

    return { outputPath, clothingPixelCount: cropWidth * cropHeight };
}

// =====================================================
// MAIN ISOLATION PIPELINE
// =====================================================

async function isolateClothing(imagePath, outputPath) {
    const segmenter = await getSegmenter();

    if (!segmenter) {
        return createSalientOutfitCrop(imagePath, outputPath);
    }

    try {
        const segments = await segmenter(imagePath);
        if (!Array.isArray(segments) || segments.length === 0) {
            return createSalientOutfitCrop(imagePath, outputPath);
        }

        const metadata = await sharp(imagePath).metadata();
        const origWidth = metadata.width;
        const origHeight = metadata.height;

        // Collect clothing segments
        const clothingSegments = segments.filter(s => isClothing(s.label));

        if (clothingSegments.length === 0) {
            console.log("No specific clothing segment found, using torso crop");
            return createSalientOutfitCrop(imagePath, outputPath);
        }

        // Combine masks
        const combinedMask = Buffer.alloc(origWidth * origHeight, 0);

        for (const seg of clothingSegments) {
            if (!seg.mask) continue;
            try {
                const maskBuffer = Buffer.from(seg.mask.data || seg.mask);
                const maskWidth = seg.mask.width || origWidth;
                const maskHeight = seg.mask.height || origHeight;
                const maskChannels = seg.mask.channels || 1;

                const maskImg = await sharp(maskBuffer, {
                    raw: { width: maskWidth, height: maskHeight, channels: maskChannels }
                })
                    .resize(origWidth, origHeight, { fit: 'fill' })
                    .grayscale()
                    .raw()
                    .toBuffer();

                for (let i = 0; i < combinedMask.length; i++) {
                    if (maskImg[i] > 128) {
                        combinedMask[i] = 255;
                    }
                }
            } catch (maskErr) {
                console.warn(`Mask processing error for label ${seg.label}:`, maskErr.message);
            }
        }

        // Apply mask to original image to create transparent PNG
        const originalRGB = await sharp(imagePath)
            .resize(origWidth, origHeight)
            .removeAlpha()
            .raw()
            .toBuffer();

        const rgbaOutput = Buffer.alloc(origWidth * origHeight * 4);
        let count = 0;

        for (let i = 0; i < origWidth * origHeight; i++) {
            const isOpaque = combinedMask[i] > 128;
            rgbaOutput[i * 4] = originalRGB[i * 3];
            rgbaOutput[i * 4 + 1] = originalRGB[i * 3 + 1];
            rgbaOutput[i * 4 + 2] = originalRGB[i * 3 + 2];
            rgbaOutput[i * 4 + 3] = isOpaque ? 255 : 0;
            if (isOpaque) count++;
        }

        if (count < 100) {
            return createSalientOutfitCrop(imagePath, outputPath);
        }

        await sharp(rgbaOutput, {
            raw: { width: origWidth, height: origHeight, channels: 4 }
        })
            .png()
            .toFile(outputPath);

        const detectedLabels = clothingSegments.map(s => s.label);
        console.log(`👗 SegFormer isolated ${count} clothing pixels across [${detectedLabels.join(', ')}]: ${outputPath}`);
        return { outputPath, clothingPixelCount: count, detectedLabels };

    } catch (err) {
        console.warn("Segmentation processing fallback:", err.message);
        return createSalientOutfitCrop(imagePath, outputPath);
    }
}

module.exports = {
    isolateClothing
};