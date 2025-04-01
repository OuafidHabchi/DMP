const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../../utils/notifications');

// Répertoire pour stocker les images
const uploadDirectory = path.join(__dirname, '../uploadsdailynote');

// Vérifiez si le répertoire existe, sinon créez-le
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

exports.createDailyNote = async (req, res) => {
    try {
        const DailyNote = req.connection.models.DailyNote;
        let Employe = req.connection.models.Employee; // ✅ Vérifier le modèle `Employee`

        if (!Employe) {
            // 🔥 Dynamically require and initialize the Employee model
            const employeeSchema = require('../../Employes-api/models/Employee'); // Adjust the path if necessary
            Employe = req.connection.model('Employee', employeeSchema);
        }

        // ✅ Construction des données de la note quotidienne
        const dailyNoteData = {
            problemDescription: req.body.problemDescription || "",
            problemType: req.body.problemType || "",
            employee: req.body.employee ? JSON.parse(req.body.employee) : {},
            assignedVanNameForToday: req.body.assignedVanNameForToday || "",
            today: Array.isArray(req.body.today) ? req.body.today[0] : req.body.today, // Assure une seule date
            time: req.body.time || "",
        };

        // ✅ Gestion du fichier (photo)
        if (req.file) {
            dailyNoteData.photo = `uploads-daily-notes/${req.file.filename}`;
        }

        // ✅ Crée une nouvelle instance de DailyNote avec les données
        const dailyNote = new DailyNote(dailyNoteData);

        // ✅ Sauvegarde la note dans la base de données
        await dailyNote.save();

        // ✅ 🔥 Émettre l'événement Socket.IO pour mise à jour en temps réel
        const io = req.app.get('socketio');
        io.emit('newDailyNote', dailyNote);

        // ✅ Répondre au client avant d'envoyer les notifications
        res.status(200).json(dailyNote);

        // ✅ Vérification et récupération des managers après avoir répondu au client
        if (Employe) {
            const managers = await Employe.find({ role: 'manager' }).select('expoPushToken');

            // ✅ Envoi des notifications aux managers ayant un expoPushToken
            for (const manager of managers) {
                if (manager.expoPushToken) {
                    const notificationBody = `A new ${req.body.problemType} Problme has been send. Check it now!`;
                    const screen = '(manager)/(tabs)/(accueil)/Accueil'; // ✅ Ajout du screen path

                    await sendPushNotification(manager.expoPushToken, notificationBody, screen);
                }
            }
        } else {
            // rien à faire ici pour le moment
        }


    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de la note.', details: error.message });
    }
};



// Obtenir toutes les DailyNotes
exports.getAllDailyNotes = async (req, res) => {
    try {
        const DailyNote = req.connection.models.DailyNote;
        const dailyNotes = await DailyNote.find() || [];
        res.status(200).json(dailyNotes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des notes.', details: error.message });
    }
};

// Obtenir les DailyNotes par date
exports.getDailyNotesByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(500).json({ error: "La date est requise dans la requête." });
        }

        const DailyNote = req.connection.models.DailyNote;
        const dailyNotes = await DailyNote.find({ today: date });
        res.status(200).json(dailyNotes.length ? dailyNotes : []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des notes.', details: error.message });
    }
};

// Marquer une DailyNote comme lue
exports.markAsRead = async (req, res) => {
    try {
        const { noteId } = req.body;
        if (!noteId) {
            return res.status(500).json({ error: "L'ID de la note est requis." });
        }

        const DailyNote = req.connection.models.DailyNote;
        const updatedNote = await DailyNote.findByIdAndUpdate(noteId, { lu: true }, { new: true });

        res.status(200).json(updatedNote || {}); // Retourne un objet vide si la note n'existe pas
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la note.', details: error.message });
    }
};

// Obtenir les détails d'une DailyNote
exports.getNoteDetails = async (req, res) => {
    try {
        const { noteId } = req.params;
        const DailyNote = req.connection.models.DailyNote;
        const note = await DailyNote.findById(noteId);

        res.status(200).json(note || {}); // Retourne un objet vide si la note n'existe pas
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération de la note.', details: error.message });
    }
};
