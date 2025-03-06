const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Chemin du dossier des uploads
const uploadDir = path.join(__dirname, '../uploads');

// Fonction pour vérifier et créer le dossier
const ensureUploadDirExists = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Contrôleur pour gérer l'upload et le parsing du fichier CSV
exports.uploadCSV = (req, res) => {  
  if (!req.file) {
    return res.status(500).json({ message: 'Aucun fichier uploadé' });
  }

  // Assurez-vous que le dossier des uploads existe
  ensureUploadDirExists();

  const filePath = path.join(uploadDir, req.file.filename);
  const results = [];

  // Lire et parser le fichier CSV
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', () => {
      // Supprime le fichier après traitement
      fs.unlinkSync(filePath);
      
      // Renvoie les données parsées au client
      res.json(results);
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'Erreur lors de la lecture du fichier CSV', error: err });
    });
};
