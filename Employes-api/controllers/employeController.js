const { sendPushNotification } = require('../../utils/notifications');
const logger = require('../../utils/logger');

// Inscription d'un employé
exports.registeremploye = async (req, res) => {
    try {
        const { name, familyName, tel, email, password, role, language, scoreCard, expoPushToken, dsp_code, invitationId } = req.body;
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const Invitation = req.connection.models.Invitation; // Modèle dynamique pour Invitation

        // Vérification si l'employé existe déjà
        const existingEmploye = await Employe.findOne({ email });
        if (existingEmploye) {
            return res.status(500).json({ message: 'Employé avec cet email existe déjà.' });
        }

        // Création du nouvel employé
        const newEmploye = new Employe({
            name,
            familyName,
            tel,
            email,
            password,
            role,
            language,
            scoreCard,
            Transporter_ID: '',
            expoPushToken,
            dsp_code,
        });

        await newEmploye.save();

        // ✅ Invalider l'invitation après création de l'utilisateur
        if (invitationId) {
            await Invitation.findByIdAndUpdate(invitationId, { fonctionnel: false });
        }

        // 🔥 Récupérer les tokens Expo des managers
        const managers = await Employe.find({ role: "manager", dsp_code: dsp_code, expoPushToken: { $exists: true } });
        const tokens = managers.map(manager => manager.expoPushToken);

        // 🔥 Envoyer la notification à tous les managers
        // 🔥 Envoyer la notification à tous les managers
        if (tokens.length > 0) {
            const message = `New employee account created: ${name} ${familyName}.`;
            for (const token of tokens) {
                await sendPushNotification(token, message);
            }
        }


        res.status(200).json(newEmploye);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'inscription de l\'employé', error });
    }
};




// Exemple pour `loginemploye` :
exports.loginemploye = async (req, res) => {
    try {
        if (!req.connection) {
            throw new Error('Connexion MongoDB non injectée dans req.connection.');
        }

        if (!req.connection.models) {
            throw new Error('Les modèles MongoDB ne sont pas injectés dans req.connection.models.');
        }

        const Employe = req.connection.models.Employee;
        if (!Employe) {
            throw new Error('Le modèle "Employee" n\'est pas enregistré dans la connexion.');
        }

        const { email, password } = req.body;
        const existingEmploye = await Employe.findOne({ email });

        if (!existingEmploye || existingEmploye.password !== password) {
            return res.status(500).json({ message: 'Email ou mot de passe incorrect.' });
        }

        res.status(200).json(existingEmploye);
    } catch (error) {
        logger.error(`Erreur dans loginemploye : ${error.message}`);
        res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
    }
};



// Récupération du profil d'un employé
exports.getemployeProfile = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const employe = await Employe.findById(req.params.id);

        if (!employe) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json(employe);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du profil', error });
    }
};

// Suppression d'un employé
exports.deleteEmploye = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const employe = await Employe.findByIdAndDelete(req.params.id);

        if (!employe) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json({ message: 'Employé supprimé avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression', error });
    }
};

// Mise à jour du profil d'un employé
exports.updateemployeProfile = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const updatedEmploye = await Employe.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedEmploye) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json(updatedEmploye);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
    }
};

// Récupérer tous les employés
exports.getAllEmployees = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee;

        if (!Employe) {
            return res.status(500).json({ error: 'Le modèle Employee n\'est pas disponible dans la connexion actuelle.' });
        }

        const employees = await Employe.find() || [];

        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des employés.', details: error.message });
    }
};


// Mise à jour des scoreCards
exports.updateScoreCardByTransporterIDs = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const transporters = req.body;
        const updateResults = [];

        for (const transporter of transporters) {
            const employe = await Employe.findOne({ Transporter_ID: transporter.Transporter_ID });

            if (!employe) {
                updateResults.push({ Transporter_ID: transporter.Transporter_ID, status: 'Not Found' });
                continue;
            }

            employe.scoreCard = transporter.scoreCard;
            employe.focusArea = transporter.focusArea || employe.focusArea;
            await employe.save();

            // Envoi de notification si un token est fourni
            if (employe.expoPushToken) {
                const message = `Your new Scrore Card is : ${transporter.scoreCard} `;
                await sendPushNotification(employe.expoPushToken, message);
            }

            updateResults.push({ Transporter_ID: transporter.Transporter_ID, status: 'Updated Successfully' });
        }

        res.status(200).json({ message: 'Mise à jour terminée', results: updateResults });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des scoreCards :', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour des scoreCards', error });
    }
};


// Récupérer plusieurs employés par ID
exports.getEmployeesByIds = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee;
        const { ids } = req.body;

        if (!Employe) {
            return res.status(500).json({ error: 'Le modèle Employee n\'est pas disponible dans la connexion actuelle.' });
        }

        const employees = await Employe.find({ _id: { $in: ids } }) || [];

        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des employés.', details: error.message });
    }
};

