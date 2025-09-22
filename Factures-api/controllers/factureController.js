const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../../utils/notifications');
const {
  uploadMulterFiles,
  deleteByUrls,
} = require('../../utils/storage/uploader');
// Répertoire pour stocker les images
const uploadDirectory = path.join(__dirname, '../uploadsFacture');

// Vérifiez si le répertoire existe, sinon créez-le
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}


exports.createFacture = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const Employee  = req.connection.models.Employee;

    if (!Factures) {
      console.error('[createFacture] Missing Factures model');
      return res.status(500).json({ error: 'Erreur de configuration serveur' });
    }

    const { name, createdBy, createdAt, note } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom de la facture est requis' });
    }

    // accept single or multiple multer entries
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (!files.length) {
      return res.status(400).json({ error: 'Le fichier (image/pdf) est requis' });
    }

    // 1) Upload first
    const uploaded = await uploadMulterFiles(files, {
      pathPrefix: `factures/${Date.now()}` // temp folder; doc _id not known yet
    });

    if (!uploaded?.length || !uploaded[0]?.url) {
      console.error('[createFacture] Upload failed or no URL returned:', uploaded);
      return res.status(500).json({ error: "Échec d'upload du fichier" });
    }

    const fileUrl = uploaded[0].url;

    // 2) Now create the document WITH fileUrl to satisfy schema
    const facture = await Factures.create({
      name,
      createdBy,
      createdAt: createdAt || new Date().toString(),
      note,
      fileUrl,                 // <-- required field provided here
    });

    // 3) (optional) move to a path that uses the final _id, if you want
    //    If your uploader supports moving/renaming, you could do it here.
    //    Otherwise, leave as-is.

    // 4) Notifications (unchanged)
    if (Employee) {
      const managers = await Employee.find({ role: 'manager' }).select('expoPushToken');
      const creator  = await Employee.findById(facture.createdBy).select('name familyName');
      for (const manager of managers) {
        if (manager.expoPushToken) {
          const notificationBody = `${creator?.name ?? ''} ${creator?.familyName ?? ''} has issued a new invoice. Please check it now!`;
          const screen = '(manager)/(tabs)/(RH)/Factures';
          await sendPushNotification(manager.expoPushToken, notificationBody, screen);
        }
      }
    }

    return res.status(200).json({ success: true, data: facture });
  } catch (error) {
    console.error('createFacture error:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création de la facture' });
  }
};



// Récupérer toutes les factures + infos créateur
exports.getFactures = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const Employee = req.connection.models.Employee;

    const factures = await Factures.find({}) || [];

    const facturesWithCreators = await Promise.all(
      factures.map(async (f) => {
        const e = await Employee.findById(f.createdBy);
        return {
          ...f.toJSON(),
          creator: e ? { name: e.name, familyName: e.familyName } : null,
        };
      })
    );

    return res.status(200).json(facturesWithCreators.reverse());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};



// Récupérer une facture par ID
exports.getFactureById = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const Employee = req.connection.models.Employee;

    const facture = await Factures.findById(req.params.id);
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });

    const e = await Employee.findById(facture.createdBy);
    const payload = {
      ...facture.toJSON(),
      creator: e ? { name: e.name, familyName: e.familyName } : null,
    };

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


// Mettre à jour une facture (nom + remplacement du fichier)
exports.updateFacture = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const facture = await Factures.findById(req.params.id);
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });

    const { name, note } = req.body;

    if (name !== undefined) facture.name = name;
    if (note !== undefined) facture.note = note;

    const files = Array.isArray(req.files)
      ? req.files
      : (req.file ? [req.file] : []);

    if (files.length > 0) {
      // supprimer l'ancien fichier si présent
      if (facture.fileUrl) await deleteByUrls([facture.fileUrl]);

      const uploaded = await uploadMulterFiles(files, {
        pathPrefix: `factures/${facture._id}`,
      });
      if (!uploaded.length) {
        return res.status(500).json({ message: "Échec d'upload du nouveau fichier" });
      }
      facture.fileUrl = uploaded[0].url;
    }

    await facture.save();
    return res.status(200).json(facture);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Supprimer une facture (et son fichier dans Spaces)
exports.deleteFacture = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const facture = await Factures.findById(req.params.id);
    if (!facture) return res.status(500).json({ message: 'Facture non trouvée' });

    if (facture.fileUrl) {
      await deleteByUrls([facture.fileUrl]).catch(() => {});
    }

    await facture.deleteOne();

    return res.status(200).json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la facture :', error);
    return res.status(500).json({ error: error.message });
  }
};
