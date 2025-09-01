const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024,
    files: 10,
  },
  // middlewares/upload.js (REMPLACE just fileFilter)
  fileFilter: (req, file, cb) => {
    const mt = (file.mimetype || '').toLowerCase();
    const isImage = mt.startsWith('image/');
    const isPdf = mt === 'application/pdf';
    const isVideo = mt.startsWith('video/'); // ➜ autorise vidéo

    if (isImage || isPdf || isVideo) return cb(null, true);
    return cb(new Error(`Type non autorisé: ${mt}`), false);
  },

});

module.exports = upload;
