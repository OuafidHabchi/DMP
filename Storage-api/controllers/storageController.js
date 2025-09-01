// Storage-api/controllers/storageController.js
const { uploadMulterFiles, deleteByUrls, deleteByKeys } = require('../../utils/storage/uploader');

/**
 * POST /api/storage/upload?folder=...&prefix=...
 * Body (multipart): files[]
 * Retour: { files: [{ fileName, url, key, type, size }, ...] }
 */
exports.uploadAny = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ message: 'Aucun fichier reçu' });

    const folder = (req.query.folder || '').toString().replace(/^\/+|\/+$/g, '');
    const prefix = (req.query.prefix || '').toString().replace(/^\/+|\/+$/g, '');

    // pathPrefix final -> "prefix/folder" (les deux sont optionnels)
    const parts = [];
    if (prefix) parts.push(prefix);
    if (folder) parts.push(folder);
    const pathPrefix = parts.join('/');

    const uploaded = await uploadMulterFiles(files, { pathPrefix });
    res.status(200).json({ files: uploaded });
  } catch (e) {
    console.error('[storage.uploadAny]', e);
    res.status(500).json({ message: 'Erreur upload', error: e.message });
  }
};

/**
 * POST /api/storage/delete-urls
 * Body: { urls: [ "https://.../path/file.ext", ... ] }
 */
exports.deleteByUrls = async (req, res) => {
  try {
    const { urls } = req.body || {};
    if (!Array.isArray(urls) || !urls.length) {
      return res.status(400).json({ message: 'urls[] requis' });
    }
    const out = await deleteByUrls(urls);
    res.status(200).json(out);
  } catch (e) {
    console.error('[storage.deleteByUrls]', e);
    res.status(500).json({ message: 'Erreur delete', error: e.message });
  }
};

/**
 * POST /api/storage/delete-keys
 * Body: { keys: [ "prefix/folder/file.ext", ... ] }
 */
exports.deleteByKeys = async (req, res) => {
  try {
    const { keys } = req.body || {};
    if (!Array.isArray(keys) || !keys.length) {
      return res.status(400).json({ message: 'keys[] requis' });
    }
    const out = await deleteByKeys(keys);
    res.status(200).json(out);
  } catch (e) {
    console.error('[storage.deleteByKeys]', e);
    res.status(500).json({ message: 'Erreur delete', error: e.message });
  }
};
