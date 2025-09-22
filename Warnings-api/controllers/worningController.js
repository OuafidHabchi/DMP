const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../../utils/notifications');


// Définir le dossier où les images seront stockées
const uploadDirectory = path.join(__dirname, '../uploads-wornings');

// S'assurer que le dossier existe
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Obtenir toutes les warnings sans les photos
exports.getAllWornings = async (req, res) => {
    try {
        const Worning = req.connection.models.Worning;
        const wornings = await Worning.find().select('-photo'); // Exclure le champ photo
        res.status(200).json(wornings);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des warnings', error: err });
    }
};

// Obtenir un warning par ID avec gestion de l'image
exports.getWorningById = async (req, res) => {
    try {
        const { id } = req.params;
        const Worning = req.connection.models.Worning;
        const worning = await Worning.findById(id);

        if (!worning) {
            return res.status(500).send({ error: "Warning not found." });
        }

        res.status(200).json(worning);
    } catch (error) {
        res.status(500).send({ error: "Error while fetching warning details.", details: error.message });
    }
};


// Ajouter un nouveau warning
exports.createWorning = async (req, res) => {
  try {
    const {
      employeID,
      type,
      raison,
      description,
      severity,
      date,
      read,
      signature,
      link,
      expoPushToken,
      template,
      susNombre,
    } = req.body;

    const Worning = req.connection.models.Worning;
    let Employe = req.connection.models.Employee;

    if (!Employe) {
      const employeeSchema = require('../../Employes-api/models/Employee');
      Employe = req.connection.model('Employee', employeeSchema);
    }

    const newWorning = new Worning({
      employeID,
      type,
      raison,
      description,
      severity: severity || "",
      date,
      link,
      read: read === "true",
      signature: signature === "true",
      template,
      susNombre,
    });

    // ✅ Upload photo vers Spaces via utils/storage/uploader
    if (req.file && req.file.buffer) {
      const { uploadMulterFiles } = require('../../utils/storage/uploader');
      const uploaded = await uploadMulterFiles([req.file], { pathPrefix: 'warnings' });
      if (uploaded.length > 0) {
        newWorning.photo = uploaded[0].url; // URL Spaces
      }
    }

    const savedWorning = await newWorning.save();

    // ✅ Notification push
    if (expoPushToken) {
      const employeeConcerned = await Employe.findById(employeID).select('role expoPushToken name');
      if (employeeConcerned) {
        const targetScreen =
          employeeConcerned.role === 'manager'
            ? '(manager)/(tabs)/(RH)/Warnings'
            : '(driver)/(tabs)/(Employe)/EmployeeWarnings';

        const notificationBody = `You have received a new ${type}. Open the app for more details.`;
        try {
          await sendPushNotification(expoPushToken, notificationBody, targetScreen);
        } catch (error) {
          console.error("❌ Erreur push:", error);
        }
      }
    }

    res.status(200).json(savedWorning);
  } catch (err) {
    console.error("❌ Erreur createWorning:", err);
    res.status(500).json({
      message: "Erreur lors de la création du warning",
      error: err.message || err,
    });
  }
};




// Mettre à jour un warning
exports.updateWorning = async (req, res) => {
  try {
    const Worning = req.connection.models.Worning;
    const updateData = { ...req.body };

    // Si l'utilisateur demande la suppression de la photo
    if (req.body.removePhoto === "true") {
      updateData.photo = null;
    }

    // Gestion du fichier photo si présent
    if (req.file && req.file.buffer) {
      const { uploadMulterFiles } = require('../../utils/storage/uploader');
      const uploaded = await uploadMulterFiles([req.file], { pathPrefix: 'warnings' });
      if (uploaded.length > 0) {
        updateData.photo = uploaded[0].url; // URL Spaces
      }
    }

    const updatedWorning = await Worning.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedWorning) {
      return res.status(500).json({ message: "Warning introuvable" });
    }

    res.status(200).json(updatedWorning);
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du warning",
      error: err.message || err,
    });
  }
};

// Supprimer un warning
exports.deleteWorning = async (req, res) => {
  try {
    const Worning = req.connection.models.Worning;
    const deletedWorning = await Worning.findByIdAndDelete(req.params.id);

    if (!deletedWorning) {
      return res.status(500).json({ message: 'Warning introuvable' });
    }

    // ✅ Suppression de la photo dans Spaces si présente
    if (deletedWorning.photo) {
      const { deleteByUrls } = require('../../utils/storage/uploader');
      await deleteByUrls([deletedWorning.photo]);
    }

    res.status(200).json({ message: 'Warning supprimé avec succès' });
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la suppression du warning',
      error: err.message || err,
    });
  }
};

// Obtenir tous les warnings par employeID
exports.getWorningsByEmployeID = async (req, res) => {
    try {
        const Worning = req.connection.models.Worning;
        const employeID = req.params.employeID;
        const wornings = await Worning.find({ employeID }).select('-photo');
        res.status(200).json(wornings);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des warnings', error: err });
    }
};

// Ajouter plusieurs warnings
exports.createMultipleWarnings = async (req, res) => {
    try {
        const warnings = req.body;
        const Worning = req.connection.models.Worning;

        if (!Array.isArray(warnings) || warnings.length === 0) {
            return res.status(500).json({ message: 'Invalid input. Provide an array of warnings.' });
        }

        const formattedWarnings = warnings.map(warning => ({
            ...warning,
            date: new Date().toISOString().split('T')[0],
        }));

        const savedWarnings = await Worning.insertMany(formattedWarnings);
        res.status(200).json({ message: 'Warnings created successfully', data: savedWarnings });

        const notifications = formattedWarnings.filter(w => w.expoPushToken);
        if (notifications.length > 0) {
            const notificationPromises = notifications.map(warning => {
                const notificationTitle = "New Warning Created";
                const notificationBody = `A warning of type ${warning.type} has been created. Check the details in your app.`;
                return sendPushNotification(warning.expoPushToken, notificationTitle, notificationBody);
            });

            Promise.allSettled(notificationPromises).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                    } else {
                    }
                });
            });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la création de plusieurs warnings', error: err.message });
    }
};

// Vérifier les suspensions pour les employés
exports.checkSuspensionsForEmployees = async (req, res) => {
    const Worning = req.connection.models.Worning;
    const { employeIDs, date } = req.body;

    if (!employeIDs || !Array.isArray(employeIDs) || employeIDs.length === 0 || !date) {
        return res.status(500).json({ message: 'employeIDs (array) et date (string) sont requis' });
    }

    try {
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const query = {
            employeID: { $in: employeIDs },
            type: 'suspension',
            $or: [
                { startDate: { $lte: formattedDate }, endDate: { $gte: formattedDate } },
                { startDate: { $exists: false }, endDate: { $exists: false } },
            ],
        };

        const suspensions = await Worning.find(query);
        const suspensionStatuses = employeIDs.reduce((statuses, id) => {
            statuses[id] = suspensions.some(suspension => suspension.employeID === id);
            return statuses;
        }, {});

        return res.status(200).json({ suspensions: suspensionStatuses });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
};

// Obtenir tous les warnings avec template === true
exports.getTemplateWarnings = async (req, res) => {
    try {
        const Worning = req.connection.models.Worning;

        // Query the database for warnings with template === true
        const templateWarnings = await Worning.find({ template: true });

        // Return the array (empty or not)
        res.status(200).json(templateWarnings);
    } catch (err) {
        // In case of an error, return an empty array with a 200 status
        res.status(200).json([]);
    }
};


// Créer un warning (spécial composant) : accepte soit une URL photo (req.body.photo), soit un fichier (req.file)
exports.createWorningFromComponent = async (req, res) => {
  try {
    const {
      employeID,
      type,
      raison,
      description,
      severity,
      date,
      read,
      signature,
      link,
      expoPushToken,
      template,
      susNombre,
    } = req.body;

    const Worning = req.connection.models.Worning;
    let Employe = req.connection.models.Employee;
    if (!Employe) {
      const employeeSchema = require('../../Employes-api/models/Employee');
      Employe = req.connection.model('Employee', employeeSchema);
    }

    const doc = new Worning({
      employeID,
      type,
      raison,
      description,
      severity: type === 'suspension' ? '' : (severity || ''),
      date,
      link,
      read: read === 'true' || read === true,
      signature: signature === 'true' || signature === true,
      template,
      susNombre,
    });

    // 1) URL déjà hébergée (CDN)
    if (typeof req.body.photo === 'string' && /^https?:\/\//i.test(req.body.photo)) {
      doc.photo = req.body.photo;
    }
    // 2) Fichier (Multer memory)
    else if (req.file) {
      const { uploadMulterFiles } = require('../../utils/storage/uploader');
      const uploaded = await uploadMulterFiles([req.file], { pathPrefix: `warnings/${employeID}` });
      if (uploaded?.[0]?.url) doc.photo = uploaded[0].url;
    }

    const saved = await doc.save();

    // Push (optionnel)
    if (expoPushToken) {
      try {
        const emp = await Employe.findById(employeID).select('role');
        const screen = emp?.role === 'manager'
          ? '(manager)/(tabs)/(RH)/Warnings'
          : '(driver)/(tabs)/(Employe)/EmployeeWarnings';
        const body = `You have received a new ${type}. Open the app for more details.`;
        await sendPushNotification(expoPushToken, body, screen);
      } catch {}
    }

    return res.status(200).json(saved);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur création warning (component)', error: err.message || err });
  }
};

