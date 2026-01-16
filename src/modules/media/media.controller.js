const mediaService = require('./media.service');

// @desc    Upload media file
// @route   POST /api/media/upload
// @access  Public (or Private)
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        const fileUrl = await mediaService.uploadFileToSpace(req.file);

        res.status(201).json({
            message: 'File uploaded successfully',
            url: fileUrl
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadMedia
};
