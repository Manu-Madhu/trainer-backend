const { S3Client } = require('@aws-sdk/client-s3');
const sharp = require('sharp'); // Add Sharp for image processing
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');

const s3 = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
    }
});

const uploadFileToS3 = async (file, folder = 'avatars') => {
    // Generate unique filename
    const sanitizedName = path.basename(file.originalname).replace(/\s+/g, '_');
    const fileName = `${folder}/${Date.now()}_${sanitizedName}`;

    // Process image with Sharp: resize to max width 1080px, keep aspect ratio, compress quality
    let processedBuffer = file.buffer;
    try {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        // Only process if it's an image
        if (metadata.format) {
            processedBuffer = await image
                .rotate() // handle EXIF orientation
                .resize({ width: 1080, withoutEnlargement: true })
                .toFormat(metadata.format, { quality: 80 }) // JPEG/WEBP quality 80, PNG will be lossless by default
                .toBuffer();
        }
    } catch (procErr) {
        console.warn('Image processing failed, uploading original buffer:', procErr);
    }

    try {
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.DO_SPACES_BUCKET,
                Key: fileName,
                Body: processedBuffer, // use processed (compressed) buffer
                ACL: 'public-read',
                // Preserve original mime type; Sharp may have converted format, adjust if needed
                ContentType: file.mimetype
            }
        });

        const result = await upload.done();
        // Return CloudFront/Spaces URL or fallback
        return result.Location || `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${fileName}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        // Fallback for when credentials are dummy/invalid so app doesn't crash during dev
        if (process.env.DO_SPACES_KEY === 'dummy_key') {
            return `https://via.placeholder.com/150?text=${fileName}`;
        }
        throw new Error(`S3 Upload Failed: ${error.message}`);
    }
};

module.exports = uploadFileToS3;
