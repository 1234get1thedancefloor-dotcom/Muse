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

    // Crop the central region where clothing is located
    const cropLeft = Math.max(0, Math.min(width - 1, Math.floor(width * 0.10)));
    const cropTop = Math.max(0, Math.min(height - 1, Math.floor(height * 0.10)));
    const cropWidth = Math.max(1, Math.min(width - cropLeft, width - cropLeft * 2));
    const cropHeight = Math.max(1, Math.min(height - cropTop, height - cropTop * 2));

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

// =====================================================
// ISOLATE & WHITEOUT GARMENT (CATALOG-READY STUDIO CROP)
// =====================================================

async function isolateAndWhiteoutGarment(imagePath, outputPath = null) {
    const fs = require('fs');
    const metadata = await sharp(imagePath).metadata();
    const origWidth = metadata.width;
    const origHeight = metadata.height;

    let combinedMask = Buffer.alloc(origWidth * origHeight, 0);
    let hasSeg = false;
    let minX = origWidth, maxX = 0, minY = origHeight, maxY = 0;

    const segmenter = await getSegmenter();
    if (segmenter) {
        try {
            const segments = await segmenter(imagePath);
            if (Array.isArray(segments) && segments.length > 0) {
                const clothingSegments = segments.filter(s => isClothing(s.label));
                if (clothingSegments.length > 0) {
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
                                    const px = i % origWidth;
                                    const py = Math.floor(i / origWidth);
                                    if (px < minX) minX = px;
                                    if (px > maxX) maxX = px;
                                    if (py < minY) minY = py;
                                    if (py > maxY) maxY = py;
                                }
                            }
                        } catch (e) {}
                    }
                    hasSeg = (maxX > minX && maxY > minY);
                }
            }
        } catch (err) {
            console.warn("Whiteout segmentation notice:", err.message);
        }
    }

    const originalRGB = await sharp(imagePath)
        .resize(origWidth, origHeight)
        .removeAlpha()
        .raw()
        .toBuffer();

    let croppedBuffer;

    if (hasSeg) {
        // Build white background image with only clothing pixels
        const whiteRGB = Buffer.alloc(origWidth * origHeight * 3, 255);
        for (let i = 0; i < origWidth * origHeight; i++) {
            if (combinedMask[i] > 128) {
                whiteRGB[i * 3] = originalRGB[i * 3];
                whiteRGB[i * 3 + 1] = originalRGB[i * 3 + 1];
                whiteRGB[i * 3 + 2] = originalRGB[i * 3 + 2];
            }
        }

        // Add 6% padding around the bounding box
        const padX = Math.floor((maxX - minX + 1) * 0.06);
        const padY = Math.floor((maxY - minY + 1) * 0.06);
        const cropLeft = Math.max(0, Math.min(origWidth - 1, minX - padX));
        const cropTop = Math.max(0, Math.min(origHeight - 1, minY - padY));
        const cropWidth = Math.max(1, Math.min(origWidth - cropLeft, (maxX - minX + 1) + padX * 2));
        const cropHeight = Math.max(1, Math.min(origHeight - cropTop, (maxY - minY + 1) + padY * 2));

        croppedBuffer = await sharp(whiteRGB, {
            raw: { width: origWidth, height: origHeight, channels: 3 }
        })
            .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
            .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .jpeg({ quality: 90 })
            .toBuffer();
    } else {
        // Torso / garment salient crop centered on clean white canvas
        const cropLeft = Math.max(0, Math.min(origWidth - 1, Math.floor(origWidth * 0.08)));
        const cropTop = Math.max(0, Math.min(origHeight - 1, Math.floor(origHeight * 0.08)));
        const cropWidth = Math.max(1, Math.min(origWidth - cropLeft, origWidth - cropLeft * 2));
        const cropHeight = Math.max(1, Math.min(origHeight - cropTop, origHeight - cropTop * 2));

        croppedBuffer = await sharp(imagePath)
            .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
            .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .jpeg({ quality: 90 })
            .toBuffer();
    }

    if (outputPath) {
        fs.writeFileSync(outputPath, croppedBuffer);
    }

    const base64Data = `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;
    return { buffer: croppedBuffer, base64: base64Data };
}

module.exports = {
    isolateClothing,
    isolateAndWhiteoutGarment
};