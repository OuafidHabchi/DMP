const { sendPushNotification } = require('../../utils/notifications'); // Importer la fonction de notification

// Obtenir toutes les procédures
exports.getAllProcedures = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const procedures = await Procedure.find();
        res.status(200).json(procedures);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching procedures', error: err });
    }
};

// Obtenir une procédure par ID
exports.getProcedureById = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const { id } = req.params;

        const procedure = await Procedure.findById(id);
        if (!procedure) {
            return res.status(404).json({ message: 'Procedure not found' });
        }

        res.status(200).json(procedure);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching procedure', error: err });
    }
};


// Créer une nouvelle procédure
exports.createProcedure = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const procedure = new Procedure(req.body);
        // Enregistrer la procédure
        const savedProcedure = await procedure.save();

        // Envoyer les notifications à tous les tokens Expo
        const tokens = req.body.employeeExpoTokens; // S'assurer que c'est un tableau de tokens
        const notificationPromises = tokens.map(async (token) => {
            if (token) {
                await sendPushNotification(
                    token,
                    'New Procedure Created',
                    `Procedure "${savedProcedure.name}" has been added. Check it out!`
                );
            }
        });

        // Attendre que toutes les notifications soient envoyées
        await Promise.all(notificationPromises);

        res.status(200).json(savedProcedure);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// Mettre à jour une procédure
exports.updateProcedure = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const { id } = req.params;

        // Mettre à jour la procédure
        const updatedProcedure = await Procedure.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedProcedure) {
            return res.status(500).json({ message: 'Procedure not found' });
        }

        // Envoyer les notifications à tous les tokens Expo
        const tokens = req.body.employeeExpoTokens; // S'assurer que c'est un tableau de tokens
        const notificationPromises = tokens.map(async (token) => {
            if (token) {
                await sendPushNotification(
                    token,
                    'Procedure Updated',
                    `Procedure "${updatedProcedure.name}" has been updated. Check the details!`
                );
            }
        });

        // Attendre que toutes les notifications soient envoyées
        await Promise.all(notificationPromises);

        res.status(200).json(updatedProcedure);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Supprimer une procédure
exports.deleteProcedure = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const { id } = req.params;

        const deletedProcedure = await Procedure.findByIdAndDelete(id);
        if (!deletedProcedure) {
            return res.status(500).json({ message: 'Procedure not found' });
        }
        res.status(200).json({ message: 'Procedure deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting procedure', error: err });
    }
};

// Ajouter un ID à la liste 'seen' d'une procédure
exports.addToSeen = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const { id } = req.params;
        const { userId } = req.body;

        // Vérifier si la procédure existe
        const procedure = await Procedure.findById(id);
        if (!procedure) {
            return res.status(500).json({ message: 'Procedure not found' });
        }

        // Vérifier si l'utilisateur est déjà dans la liste 'seen'
        if (!procedure.seen.includes(userId)) {
            procedure.seen.push(userId); // Ajouter l'utilisateur à la liste 'seen'
            await procedure.save(); // Sauvegarder les modifications
        }

        res.status(200).json({ message: 'User added to seen list', procedure });
    } catch (err) {
        res.status(500).json({ message: 'Error adding user to seen list', error: err });
    }
};
