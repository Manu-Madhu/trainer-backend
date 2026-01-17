const uploadFileToS3 = require('../../utils/s3Upload');

// @desc    Upload single file
// @route   POST /api/upload
// @access  Public (or Protected)
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = await uploadFileToS3(req.file);
        res.json({ url: fileUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Public (or Protected)
const uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadPromises = req.files.map(file => uploadFileToS3(file));
        const urls = await Promise.all(uploadPromises);

        res.json({ urls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

module.exports = {
    uploadFile,
    uploadFiles
};
