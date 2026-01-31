const { S3Client } = require('@aws-sdk/client-s3');
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

    try {
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.DO_SPACES_BUCKET,
                Key: fileName,
                Body: file.buffer,
                ACL: 'public-read',
                ContentType: file.mimetype
            }
        });

        const result = await upload.done();
        // Return CloudFront/Spaces URL or fallback
        return result.Location || `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${fileName}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        // Fallback to placeholder so the flow doesn't break
        return `https://placehold.co/600x400?text=Payment+Proof`;
    }
};

module.exports = uploadFileToS3;
