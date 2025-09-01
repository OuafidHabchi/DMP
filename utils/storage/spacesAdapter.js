// utils/storage/spacesAdapter.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const {
  SPACES_ENDPOINT,
  SPACES_REGION,
  SPACES_BUCKET,
  SPACES_KEY,
  SPACES_SECRET,
  SPACES_CDN_BASE_URL,
} = process.env;

if (!SPACES_ENDPOINT || !SPACES_REGION || !SPACES_BUCKET || !SPACES_KEY || !SPACES_SECRET) {
  console.warn('[SpacesAdapter] Missing Spaces env vars. Check endpoint/region/bucket/key/secret.');
}

const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,     // DO Spaces endpoint
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,         // DO Spaces utilise le style virtuel (bucket dans le host)
});

/**
 * Construit l’URL publique finale (CDN si fourni, sinon URL Spaces)
 */
function publicUrlForKey(key) {
  if (SPACES_CDN_BASE_URL) {
    // ex: https://cdn.mondomaine.com/vehicles/<id>/fichier.pdf
    return `${SPACES_CDN_BASE_URL.replace(/\/+$/, '')}/${key}`;
  }
  // ex: https://<bucket>.<region>.digitaloceanspaces.com/vehicles/<id>/fichier.pdf
  const host = SPACES_ENDPOINT.replace(/^https?:\/\//, '');
  return `https://${SPACES_BUCKET}.${host}/${key}`;
}

/**
 * Upload d’un buffer vers Spaces
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {String} params.mimeType
 * @param {String} params.originalName
 * @param {String} params.pathPrefix  ex: vehicles/<vehicleId>
 * @returns {Promise<{url: string, key: string, size: number, mimeType: string, fileName: string}>}
 */
async function upload({ buffer, mimeType, originalName, pathPrefix }) {
  const safeName = originalName.normalize('NFKC').replace(/[/\\?%*:|"<>]/g, '-');
  const key = `${pathPrefix.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${safeName}`;

  await s3.send(new PutObjectCommand({
    Bucket: SPACES_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read', // Public (si tu veux privé, retire cette ligne et sers via URL signée)
  }));

  return {
    url: publicUrlForKey(key),
    key,
    size: buffer.length,
    mimeType,
    fileName: safeName,
  };
}

/**
 * Suppression d’un objet via sa key
 */
async function remove(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({
    Bucket: SPACES_BUCKET,
    Key: key,
  }));
}

module.exports = {
  upload,
  remove,
  publicUrlForKey,
};
