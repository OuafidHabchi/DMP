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
        let Employe = req.connection.models.Employee; // ✅ Vérifier le modèle `Employee`

        if (!Employe) {
            // 🔥 Dynamically require and initialize the Employee model
            const employeeSchema = require('../../Employes-api/models/Employee'); // Adjust the path if necessary
            Employe = req.connection.model('Employee', employeeSchema);
        }
        // Création du warning avec les données reçues
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


        // Gestion du fichier photo si présent
        if (req.file) {
            newWorning.photo = `uploads-wornings/${req.file.filename}`;
        }
        // Sauvegarde du warning dans la base de données
        const savedWorning = await newWorning.save();


        // Envoi d'une notification si un token Expo est fourni
        if (expoPushToken) {
            const employeeConcerned = await Employe.findById(employeID).select('role expoPushToken name');
            if (!employeeConcerned) {
                return res.status(200).json(savedWorning);
            }

            const targetScreen = employeeConcerned.role === 'manager'
                ? '(manager)/(tabs)/(RH)/Warnings'
                : '(driver)/(tabs)/(Employe)/EmployeeWarnings';

            const notificationBody = `You have received a new ${type}. Open the app for more details.`;
            try {
                await sendPushNotification(expoPushToken, notificationBody, targetScreen);
            } catch (error) {

            }
        }

        // Réponse avec le warning sauvegardé
        res.status(200).json(savedWorning);
    } catch (err) {
        // Réponse en cas d'erreur
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

        if (req.body.removePhoto === "true") {
            updateData.photo = null;
        }

        // Gestion du fichier photo si présent
        if (req.file) {
            updateData.photo = `uploads-wornings/${req.file.filename}`;
        }

        const updatedWorning = await Worning.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedWorning) return res.status(500).json({ message: "Warning introuvable" });

        res.status(200).json(updatedWorning);
    } catch (err) {
        res.status(500).json({ message: "Erreur lors de la mise à jour du warning", error: err });
    }
};

// Supprimer un warning
exports.deleteWorning = async (req, res) => {
    try {
        const Worning = req.connection.models.Worning;
        const deletedWorning = await Worning.findByIdAndDelete(req.params.id);

        if (!deletedWorning) return res.status(500).json({ message: 'Warning introuvable' });

        if (deletedWorning.photo) {
            const filePath = path.join(__dirname, '../', deletedWorning.photo);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(200).json({ message: 'Warning supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la suppression du warning', error: err });
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
