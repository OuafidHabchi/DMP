// en haut de Fleet-api/controllers/vehicleController.js
const storage = require('../../utils/storage/index');          // ton adapter Spaces via utils/storage/index.js
const { uploadMulterFiles,deleteByUrls  } = require('../../utils/storage/uploader');


// Ajouter un véhicule (+ documents dans la même requête)
// Ajouter un véhicule (+ upload éventuel des documents vers Spaces)
exports.addVehicle = async (req, res) => {
  try {
    const { vehicleNumber, model, type, geotab, vin, license, Location, status } = req.body;
    const Vehicle = req.connection.models.Vehicle;

   

    // validations minimales
    if (!vehicleNumber || !vin || !license) {
      return res.status(400).json({
        message: 'Champs requis manquants',
        details: { vehicleNumber: !vehicleNumber, vin: !vin, license: !license },
      });
    }

    // 1) créer le véhicule sans documents
    const newVehicle = new Vehicle({
      vehicleNumber,
      model,
      type,
      geotab,
      vin,
      license,
      Location,
      status,
      documents: [],
    });
    await newVehicle.save();

    // 2) si fichiers => upload via helper réutilisable
    if (req.files && req.files.length > 0) {
      const uploaded = await uploadMulterFiles(req.files, {
        pathPrefix: `vehicles/${newVehicle._id}`,
      });
      // uploaded = [{ fileName, url, type, key, size }]

      newVehicle.documents.push(
        ...uploaded.map(f => ({
          fileName: f.fileName,
          url: f.url,
          type: f.type,
        }))
      );

      await newVehicle.save();
    }

    return res.status(200).json({
      message: 'Véhicule ajouté avec succès',
      vehicle: newVehicle,
    });
  } catch (error) {
    console.error('addVehicle error:', error);
    return res.status(500).json({
      message: "Erreur lors de l'ajout du véhicule",
      error: error.message,
    });
  }
};



// Récupérer tous les véhicules
exports.getAllVehicles = async (req, res) => {
  try {
    const Vehicle = req.connection.models.Vehicle;

    if (!Vehicle) {
      return res.status(500).json({ error: 'Le modèle Vehicle n\'est pas disponible dans la connexion actuelle.' });
    }

    const vehicles = await Vehicle.find() || [];

    res.status(200).json({ data: vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des véhicules.', details: error.message });
  }
};

// Récupérer un véhicule par ID
exports.getVehicleById = async (req, res) => {
  try {
    const Vehicle = req.connection.models.Vehicle;

    if (!Vehicle) {
      return res.status(500).json({ error: 'Le modèle Vehicle n\'est pas disponible dans la connexion actuelle.' });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    res.status(200).json({ data: vehicle || {} }); // Retourne un objet vide si non trouvé
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du véhicule.', details: error.message });
  }
};


// Mettre à jour un véhicule (+ ajout/suppression de documents dans la même requête)
exports.updateVehicleById = async (req, res) => {
  try {
    const { vehicleNumber, model, type, geotab, vin, license, Location, status } = req.body;
    const Vehicle = req.connection.models.Vehicle;

    // 1) récupérer le véhicule
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(500).json({ message: 'Véhicule non trouvé' });
    }

    // 2) MAJ champs de base si fournis
    if (vehicleNumber !== undefined) vehicle.vehicleNumber = vehicleNumber;
    if (model !== undefined) vehicle.model = model;
    if (type !== undefined) vehicle.type = type;
    if (geotab !== undefined) vehicle.geotab = geotab;
    if (vin !== undefined) vehicle.vin = vin;
    if (license !== undefined) vehicle.license = license;
    if (Location !== undefined) vehicle.Location = Location;
    if (status !== undefined) vehicle.status = status;

    // 3) suppression de documents (optionnelle)
    //    accepte deleteDocumentIds = '["subdocId1","subdocId2"]' ou 'subdocId1,subdocId2'
    let deleteIds = [];
    if (req.body.deleteDocumentIds) {
      try {
        deleteIds = Array.isArray(req.body.deleteDocumentIds)
          ? req.body.deleteDocumentIds
          : JSON.parse(req.body.deleteDocumentIds);
      } catch {
        deleteIds = String(req.body.deleteDocumentIds).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (deleteIds.length > 0) {
      const toDelete = new Set(deleteIds.map(String));
      const docsToDelete = (vehicle.documents || []).filter(d => toDelete.has(String(d._id)));

      // suppression côté Spaces en une ligne (via URLs)
      await deleteByUrls(docsToDelete.map(d => d.url));

      // nettoyage DB
      vehicle.documents = (vehicle.documents || []).filter(d => !toDelete.has(String(d._id)));
    }



    // 4) ajout de nouveaux documents (optionnel)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const up = await storage.upload({
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
          pathPrefix: `vehicles/${vehicle._id}`,
        });

        vehicle.documents.push({
          fileName: up.fileName,
          url: up.url,
          type: up.mimeType,
        });
      }
    }

    // 5) sauvegarde finale
    const updatedVehicle = await vehicle.save();
    return res.status(200).json({ message: 'Véhicule mis à jour avec succès', vehicle: updatedVehicle });
  } catch (error) {
    console.error('updateVehicleById error:', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du véhicule', error: error.message });
  }
};



// Supprimer un véhicule (+ tous ses documents associés dans Spaces)
exports.deleteVehicleById = async (req, res) => {
  try {
    const Vehicle = req.connection.models.Vehicle;

    // 1) Récupérer le véhicule
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // 2) Supprimer les objets dans Spaces (via URLs) si présents
    try {
      const urls = (vehicle.documents || []).map(d => d.url).filter(Boolean);
      if (urls.length > 0) {
        await deleteByUrls(urls);
      }
    } catch (e) {
      // On loggue mais on continue la suppression DB pour éviter un état zombie
      console.warn('[deleteVehicleById] Erreur suppression Spaces:', e?.message || e);
    }

    // 3) Supprimer le véhicule en DB
    await Vehicle.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Véhicule supprimé avec succès' });
  } catch (error) {
    console.error('deleteVehicleById error:', error);
    return res.status(500).json({
      message: 'Erreur lors de la suppression du véhicule',
      error: error.message,
    });
  }
};

