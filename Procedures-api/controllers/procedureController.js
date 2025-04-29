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
        const Procedure = req.connection.models.Procedure;
        const Employee = req.connection.models.Employee;
        const procedure = new Procedure(req.body);
        const savedProcedure = await procedure.save();

        // Récupérer le créateur de la procédure
        const creator = await Employee.findById(savedProcedure.createdBy);
        const creatorName = creator ? `${creator.name} ${creator.familyName}` : "Unknown";

        // Récupérer tous les employés dans la collection Employee
        const employees = await Employee.find({ expoPushToken: { $exists: true } });

        // Envoyer les notifications
        const notificationPromises = employees.map(async (emp) => {
            let screen = '';
            // Ajouter le screen en fonction du rôle de l'employé
            if (emp.role === 'manager') {
                screen = '(manager)/(tabs)/(RH)/Procedure';
            } else if (emp.role === 'driver') {
                screen = '(driver)/(tabs)/(Employe)/ProcedureEmployee';
            }

            // Message incluant le nom du créateur
            const message = `New procedure "${savedProcedure.name}" created by ${creatorName}. Tap to see the details.`;

            await sendPushNotification(
                emp.expoPushToken,
                message,
                screen
            );
        });

        await Promise.all(notificationPromises);

        res.status(200).json(savedProcedure);
    } catch (err) {
        console.error("Erreur lors de la création de la procédure :", err.message);
        res.status(500).json({ message: err.message });
    }
};





// Mettre à jour une procédure
exports.updateProcedure = async (req, res) => {
    try {
        const Procedure = req.connection.models.Procedure; // Modèle dynamique
        const Employee = req.connection.models.Employee;
        const { id } = req.params;

        // Récupérer la procédure existante
        const oldProcedure = await Procedure.findById(id);
        if (!oldProcedure) {
            console.error("Procédure non trouvée");
            return res.status(500).json({ message: 'Procedure not found' });
        }

        // Mettre à jour la procédure
        const updatedProcedure = await Procedure.findByIdAndUpdate(id, req.body, { new: true });

        // Récupérer le créateur de la procédure
        const creator = await Employee.findById(updatedProcedure.createdBy);
        const creatorName = creator ? `${creator.name} ${creator.familyName}` : "Unknown";

        // Récupérer tous les employés dans la collection Employee
        const employees = await Employee.find({ expoPushToken: { $exists: true } });

        // Envoyer les notifications aux employés concernés
        const notificationPromises = employees.map(async (emp) => {
            if (emp.expoPushToken) {
                let screen = '';
                // Déterminer l'écran de notification selon le rôle
                if (emp.role === 'manager') {
                    screen = '(manager)/(tabs)/(RH)/Procedure';
                } else if (emp.role === 'driver') {
                    screen = '(driver)/(tabs)/(Employe)/ProcedureEmployee';
                }

                // Message de notification incluant le nom du créateur
                const message = `The procedure "${updatedProcedure.name}" created by ${creatorName} has been updated. Check the details!`;

                await sendPushNotification(
                    emp.expoPushToken,
                    message,
                    screen
                );
            }
        });

        // Attendre que toutes les notifications soient envoyées
        await Promise.all(notificationPromises);

        res.status(200).json(updatedProcedure);
    } catch (err) {
        console.error("Erreur lors de la mise à jour de la procédure :", err.message);
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
