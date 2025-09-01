// utils/storage/uploader.js
const storage = require('./index');           // <- ton driver (Spaces)
const keyFromUrl = require('./keyFromUrl');   // <- déjà fourni

/**
 * Upload d'une liste de fichiers Multer (memoryStorage) vers Spaces
 * @param {Array<Multer.File>} files  req.files
 * @param {Object} opts
 * @param {String} opts.pathPrefix    ex: 'vehicles/123', 'notes/xyz'
 * @returns {Promise<Array<{fileName, url, key, type, size}>>}
 */
async function uploadMulterFiles(files = [], { pathPrefix = '' } = {}) {
  const out = [];
  for (const f of files) {
    const res = await storage.upload({
      buffer: f.buffer,
      mimeType: f.mimetype,
      originalName: f.originalname,
      pathPrefix,
    });
    out.push({
      fileName: res.fileName,
      url: res.url,
      key: res.key,
      type: res.mimeType,
      size: res.size,
    });
  }
  return out;
}

/**
 * Supprime des objets Spaces à partir d'une liste d'URLs publiques
 * @param {string[]} urls
 */
async function deleteByUrls(urls = []) {
  const keys = urls
    .map(u => keyFromUrl(u))
    .filter(Boolean);
  for (const key of keys) {
    await storage.remove(key);
  }
  return { deleted: keys.length };
}

/**
 * Supprime des objets Spaces à partir d'une liste de keys
 * @param {string[]} keys
 */
async function deleteByKeys(keys = []) {
  for (const key of keys) {
    await storage.remove(key);
  }
  return { deleted: keys.length };
}

module.exports = { uploadMulterFiles, deleteByUrls, deleteByKeys };
