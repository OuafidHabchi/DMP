const path = require('path');

exports.createEquipmentUpdate = async (req, res) => {
  try {
    const EquipmentUpdate = req.connection.models.EquipmentUpdate; // Modèle dynamique
    const { employeeName, vanName, localTime,userId,photoType,day } = req.body;
    if (!employeeName || !vanName || !localTime) {
      return res.status(500).json({ message: "Les informations de l'employé, du van et du temps sont requises." });
    }

    // Validation si aucun fichier n'est uploadé
    if (!req.file) {
      return res.status(500).json({ message: "L'image est requise." });
    }

    // Création d'un nouvel enregistrement
    const equipmentUpdate = new EquipmentUpdate({
      employeeName,
      vanName,
      localTime,
      imagePath: path.join('/equipment-uploads', req.file.filename),
      userId,
      photoType,
      day
    });

    await equipmentUpdate.save();
    res.status(200).json(equipmentUpdate);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout des données.", error });
  }
};


// Récupérer les mises à jour d'équipement par date et type de photo
exports.getEquipmentUpdatesByDate = async (req, res) => {
  try {
      const EquipmentUpdate = req.connection.models.EquipmentUpdate;
      const { day, photoType } = req.query;

      if (!EquipmentUpdate) {
          return res.status(500).json({ error: "Le modèle EquipmentUpdate n'est pas disponible dans la connexion actuelle." });
      }

      if (!day) {
          return res.status(500).json({ error: "Le paramètre 'day' est requis." });
      }

      const query = { day };
      if (photoType) query.photoType = photoType;

      const equipmentUpdates = await EquipmentUpdate.find(query) || [];

      res.status(200).json(equipmentUpdates);
  } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des mises à jour d'équipement.", details: error.message });
  }
};


