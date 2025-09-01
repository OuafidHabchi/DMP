const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../../utils/notifications');
const { uploadMulterFiles } = require('../../utils/storage/uploader');

// Répertoire pour stocker les images
const uploadDirectory = path.join(__dirname, '../uploadsdailynote');

// Vérifiez si le répertoire existe, sinon créez-le
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

exports.createDailyNote = async (req, res) => {
    try {
        const DailyNote = req.connection.models.DailyNote;
        let Employe = req.connection.models.Employee;

        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        // ⚠️ Quand la requête vient d’un multipart, certains champs peuvent arriver en string JSON
        const employeeParsed =
            typeof req.body.employee === 'string'
                ? safelyParseJSON(req.body.employee, {})
                : (req.body.employee || {});

        // ▶️ 1) créer la note **sans** photo pour récupérer _id
        const dailyNote = new DailyNote({
            problemDescription: req.body.problemDescription || '',
            problemType: req.body.problemType || '',
            employee: employeeParsed,
            assignedVanNameForToday: req.body.assignedVanNameForToday || '',
            today: Array.isArray(req.body.today) ? req.body.today[0] : req.body.today || '',
            time: req.body.time || '',
            photo: '', // on mettra l'URL après upload éventuel
            lu: false,
        });

        await dailyNote.save();

        // ▶️ 2) si un fichier "photo" est présent (multer single), on l'envoie dans Spaces
        if (req.file) {
            const [uploaded] = await uploadMulterFiles([req.file], {
                pathPrefix: `daily-notes/${dailyNote._id}`, // dossier par note
                makePublic: true,
            });

            // on stocke l’URL publique (CDN si configuré)
            dailyNote.photo = uploaded.url;
            await dailyNote.save();
        }

        // ▶️ 3) émettre l’évènement temps réel
        const io = req.app.get('socketio');
        io.emit('newDailyNote', dailyNote);

        // ▶️ 4) répondre immédiatement au client
        res.status(200).json(dailyNote);

        // ▶️ 5) notifications aux managers (hors chemin critique de réponse)
        try {
            const managers = await Employe.find({ role: 'manager' }).select('expoPushToken');
            for (const manager of managers) {
                if (manager.expoPushToken) {
                    const notificationBody = `A new ${req.body.problemType} Problme has been send. Check it now!`;
                    const screen = '(manager)/(tabs)/(accueil)/Accueil';
                    await sendPushNotification(manager.expoPushToken, notificationBody, screen);
                }
            }
        } catch (e) {
            console.warn('[DailyNote] push notifications error:', e?.message || e);
        }
    } catch (error) {
        console.error('createDailyNote error:', error);
        res.status(500).json({
            error: 'Erreur lors de la création de la note.',
            details: error.message,
        });
    }
};

// utilitaire local pour parser du JSON en sécurité
function safelyParseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
}



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
