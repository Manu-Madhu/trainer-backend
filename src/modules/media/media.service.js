const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const path = require('path');

// Configure DigitalOcean Spaces (S3 Compatible)
const s3 = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT, // e.g., https://nyc3.digitaloceanspaces.com
    region: process.env.DO_SPACES_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
    }
});

// Multer config for memory storage
const storage = multer.memoryStorage();

// File filter to allow only images and videos
const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images and Videos Only!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const uploadFileToSpace = async (file) => {
    const target = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: `media/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ACL: 'public-read',
        ContentType: file.mimetype
    };

    try {
        const parallelUploads3 = new Upload({
            client: s3,
            params: target,
        });

        const data = await parallelUploads3.done();
        // Construct the public URL manually if Location isn't returned in the format we want (DO sometimes behaves differently than AWS S3)
        // correct format: https://<bucket>.<endpoint>/<key>
        // But usually data.Location works.
        return data.Location;
    } catch (e) {
        console.error("Upload Error", e);
        throw e;
    }
};

module.exports = {
    upload,
    uploadFileToSpace
};
