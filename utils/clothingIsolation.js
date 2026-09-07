const sharp = require("sharp");
const {
    AutoImageProcessor,
    AutoModelForSemanticSegmentation,
    RawImage
} = require("@huggingface/transformers");


// =====================================================
// MODEL
// =====================================================

const MODEL_NAME = "Xenova/segformer-b2-clothes";

let processor = null;
let model = null;


// =====================================================
// LOAD MODEL ONLY ONCE
// =====================================================

async function loadModel() {

    if (processor && model) {
        return;
    }

    console.log("👗 Loading clothing segmentation model...");

    processor = await AutoImageProcessor.from_pretrained(
        MODEL_NAME
    );

    model = await AutoModelForSemanticSegmentation.from_pretrained(
        MODEL_NAME
    );

    console.log("✅ Clothing segmentation model loaded");
}


// =====================================================
// WHICH CLOTHING CATEGORIES TO KEEP
// =====================================================

const CLOTHING_NAMES = new Set([
    "upper-clothes",
    "upper clothes",

    "shirt",
    "top",

    "skirt",

    "pants",
    "trousers",

    "dress",

    "belt",

    "left-shoe",
    "left shoe",

    "right-shoe",
    "right shoe",

    "bag",

    "scarf"
]);


// =====================================================
// CHECK WHETHER A LABEL IS CLOTHING
// =====================================================

function isClothingLabel(label) {

    if (!label) {
        return false;
    }

    const normalized =
        String(label)
            .toLowerCase()
            .trim();

    return CLOTHING_NAMES.has(normalized);
}


// =====================================================
// ISOLATE CLOTHING
// =====================================================

async function isolateClothing(
    imagePath,
    outputPath
) {

    await loadModel();


    // -------------------------------------------------
    // Read original image
    // -------------------------------------------------

    const image =
        await RawImage.read(imagePath);


    const originalWidth =
        image.width;

    const originalHeight =
        image.height;


    // -------------------------------------------------
    // Prepare image for segmentation model
    // -------------------------------------------------

    const inputs =
        await processor(image);


    // -------------------------------------------------
    // Run model
    // -------------------------------------------------

    const outputs =
        await model(inputs);


    const logits =
        outputs.logits;


    // -------------------------------------------------
    // Get predicted class for every pixel
    // -------------------------------------------------

    const segmentation =
        logits
            .argmax(1)
            .squeeze();


    const maskWidth =
        segmentation.dims[
        segmentation.dims.length - 1
        ];

    const maskHeight =
        segmentation.dims[
        segmentation.dims.length - 2
        ];


    const maskData =
        segmentation.data;


    // -------------------------------------------------
    // Get original RGB pixels
    // -------------------------------------------------

    const originalRGB =
        await sharp(imagePath)
            .resize(
                originalWidth,
                originalHeight
            )
            .removeAlpha()
            .raw()
            .toBuffer();


    // -------------------------------------------------
    // Create transparent RGBA output
    // -------------------------------------------------

    const output =
        Buffer.alloc(
            originalWidth *
            originalHeight *
            4
        );


    // -------------------------------------------------
    // Get model label names
    // -------------------------------------------------

    const id2label =
        model.config?.id2label || {};


    // -------------------------------------------------
    // Build clothing mask
    // -------------------------------------------------

    for (
        let y = 0;
        y < originalHeight;
        y++
    ) {

        for (
            let x = 0;
            x < originalWidth;
            x++
        ) {

            // Convert original image coordinates
            // to segmentation coordinates

            const maskX =
                Math.min(
                    maskWidth - 1,
                    Math.floor(
                        x /
                        originalWidth *
                        maskWidth
                    )
                );

            const maskY =
                Math.min(
                    maskHeight - 1,
                    Math.floor(
                        y /
                        originalHeight *
                        maskHeight
                    )
                );


            const maskIndex =
                maskY *
                maskWidth +
                maskX;


            const labelId =
                Number(
                    maskData[maskIndex]
                );


            const label =
                id2label[labelId];


            const keep =
                isClothingLabel(label);


            const pixelIndex =
                (
                    y *
                    originalWidth +
                    x
                ) * 3;


            const outputIndex =
                (
                    y *
                    originalWidth +
                    x
                ) * 4;


            if (keep) {

                // KEEP THE ORIGINAL COLOR
                //
                // This is important!
                // We do NOT turn clothing white.

                output[outputIndex] =
                    originalRGB[pixelIndex];

                output[outputIndex + 1] =
                    originalRGB[pixelIndex + 1];

                output[outputIndex + 2] =
                    originalRGB[pixelIndex + 2];

                output[outputIndex + 3] =
                    255;

            } else {

                // Everything else becomes transparent

                output[outputIndex] = 0;
                output[outputIndex + 1] = 0;
                output[outputIndex + 2] = 0;
                output[outputIndex + 3] = 0;

            }
        }
    }


    // -------------------------------------------------
    // Save isolated clothing image
    // -------------------------------------------------

    await sharp(output, {
        raw: {
            width: originalWidth,
            height: originalHeight,
            channels: 4
        }
    })
        .png()
        .toFile(outputPath);


    console.log(
        `👗 Clothing isolated: ${outputPath}`
    );


    return outputPath;
}


module.exports = {
    isolateClothing
};