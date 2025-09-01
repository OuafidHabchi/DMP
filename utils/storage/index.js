// utils/storage/index.js
const spaces = require('./spacesAdapter');

const { STORAGE_DRIVER } = process.env;

// Pour l’instant, on ne gère que "spaces" (tu peux ajouter "local" plus tard si besoin)
function getStorage() {
  switch ((STORAGE_DRIVER || 'spaces').toLowerCase()) {
    case 'spaces':
    default:
      return spaces;
  }
}

module.exports = getStorage();
