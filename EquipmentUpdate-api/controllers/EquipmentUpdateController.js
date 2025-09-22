const path = require('path');
const { uploadMulterFiles } = require('../../utils/storage/uploader');

exports.createEquipmentUpdate = async (req, res) => {
  try {
    const EquipmentUpdate = req.connection.models.EquipmentUpdate;
    const { employeeName, vanName, localTime, userId, photoType, day } = req.body;

    if (!employeeName || !vanName || !localTime) {
      return res.status(400).json({ message: "Les informations de l'employé, du van et du temps sont requises." });
    }
    if (!userId || !photoType || !day) {
      return res.status(400).json({ message: "userId, photoType et day sont requis." });
    }

    // ✅ Récupère le(s) fichier(s) (single ou multiple)
    const incoming = req.file ? [req.file] : (req.files || []);
    if (incoming.length === 0) {
      return res.status(400).json({ message: "L'image est requise." });
    }

    // ✅ Upload vers Spaces via l'adapter réutilisable
    const uploaded = await uploadMulterFiles(incoming, {
      pathPrefix: `equipment-updates/${day}/${userId}`,
    });

    if (!uploaded.length) {
      return res.status(500).json({ message: "Échec de l'upload de l'image." });
    }

    // on prend la première image (tu peux en gérer plusieurs plus tard)
    const file = uploaded[0];

    const equipmentUpdate = new EquipmentUpdate({
      employeeName,
      vanName,
      localTime,
      userId,
      photoType,
      day,
      imageUrl: file.url,   // ✅ URL publique Spaces
      // imagePath: undefined // (optionnel) on n'utilise plus le local
    });

    await equipmentUpdate.save();
    return res.status(200).json(equipmentUpdate);
  } catch (error) {
    console.error('createEquipmentUpdate error:', error);
    return res.status(500).json({ message: "Erreur lors de l'ajout des données.", error: error.message });
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
      return res.status(400).json({ error: "Le paramètre 'day' est requis." });
    }

    const query = { day };
    if (photoType) query.photoType = photoType;

    const equipmentUpdates = await EquipmentUpdate.find(query) || [];
    return res.status(200).json(equipmentUpdates);
  } catch (error) {
    console.error('getEquipmentUpdatesByDate error:', error);
    return res.status(500).json({ error: "Erreur lors de la récupération des mises à jour d'équipement.", details: error.message });
  }
};

