// utils/storage/keyFromUrl.js
const { SPACES_ENDPOINT, SPACES_BUCKET, SPACES_CDN_BASE_URL } = process.env;

/**
 * Tente d’extraire la "key" Spaces à partir d’une URL publique.
 * Fonctionne avec CDN (si SPACES_CDN_BASE_URL) ou URL directe Spaces.
 */
function keyFromUrl(url) {
  if (!url) return null;

  if (SPACES_CDN_BASE_URL) {
    const base = SPACES_CDN_BASE_URL.replace(/\/+$/, '') + '/';
    if (url.startsWith(base)) {
      return url.substring(base.length);
    }
  }

  if (SPACES_ENDPOINT && SPACES_BUCKET) {
    const host = SPACES_ENDPOINT.replace(/^https?:\/\//, '');
    const base = `https://${SPACES_BUCKET}.${host}/`;
    if (url.startsWith(base)) {
      return url.substring(base.length);
    }
  }

  // fallback: essaie de récupérer tout après le host
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+/, '');
  } catch {
    return null;
  }
}

module.exports = keyFromUrl;
