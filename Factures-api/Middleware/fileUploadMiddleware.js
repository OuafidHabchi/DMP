const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, "../uploadsFacture");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        try {
          fs.accessSync(uploadPath, fs.constants.W_OK);
        } catch (accessErr) {
          return cb(accessErr);
        }
      }
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = path.extname(file.originalname);
      const finalFilename = `${file.fieldname}-${uniqueSuffix}${extension}`;
      cb(null, finalFilename);
    } catch (err) {
      cb(err);
    }
  },
});

// Define file filter for image types
const fileFilter = (req, file, cb) => {
  try {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls les images et PDF sont acceptés.'), false);
    }
  } catch (err) {
    cb(err);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

module.exports = upload;
