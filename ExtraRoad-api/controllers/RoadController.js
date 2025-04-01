const { sendPushNotification } = require('../../utils/notifications'); // Fonction de notification

// Get all roads
exports.getAllRoads = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const roads = await Road.find();
        res.status(200).json(roads);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get road by ID
exports.getRoadById = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const road = await Road.findById(req.params.id);
        if (!road) return res.status(500).json({ message: 'Road not found' });
        res.status(200).json(road);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Créer une nouvelle route
exports.createRoad = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const Employee = req.connection.models.Employee;

        // Créer une nouvelle route
        const road = new Road(req.body);

        const savedRoad = await road.save();

        // Récupérer tous les employés et leurs tokens
        const employees = await Employee.find({}, 'expoPushToken role');  // Récupérer uniquement le token et le rôle

        const notificationPromises = employees.map(async (employee) => {
            if (employee.expoPushToken) {
                const screen = employee.role === 'manager'
                    ? '(manager)/(tabs)/(Dispatcher)/ExtratRoutes'
                    : '(driver)/(tabs)/(Employe)/ExtraRoadEmployee';

                await sendPushNotification(
                    employee.expoPushToken,
                    `${savedRoad.roadNumber} extra delivery routes open at ${savedRoad.startTime}. Reserve your spot now!`,
                    screen
                );

            }
        });

        await Promise.all(notificationPromises);

        res.status(200).json(savedRoad);
    } catch (err) {
        console.error("[ERROR] Une erreur est survenue:", err.message);
        res.status(500).json({ message: err.message });
    }
};



// Update a road
exports.updateRoad = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const Employee = req.connection.models.Employee;

        // Récupérer la route actuelle avant mise à jour
        const existingRoad = await Road.findById(req.params.id);
        if (!existingRoad) return res.status(404).json({ message: 'Road not found' });

        // Mise à jour de la route
        const updatedRoad = await Road.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedRoad) return res.status(500).json({ message: 'Failed to update road' });

        // Vérifier si la liste "interested" ou "notInterested" a changé
        const interestedChanged = JSON.stringify(existingRoad.interested) !== JSON.stringify(updatedRoad.interested);
        const notInterestedChanged = JSON.stringify(existingRoad.notInterested) !== JSON.stringify(updatedRoad.notInterested);

        if (interestedChanged || notInterestedChanged) {
            // Trouver les managers
            const managers = await Employee.find({ role: 'manager', expoPushToken: { $exists: true, $ne: null } });

            // Déterminer quel employé a changé d'état
            const newInterested = updatedRoad.interested.filter(id => !existingRoad.interested.includes(id));
            const newNotInterested = updatedRoad.notInterested.filter(id => !existingRoad.notInterested.includes(id));

            let message = '';

            if (newInterested.length > 0) {
                const employee = await Employee.findById(newInterested[0]);
                if (employee) {
                    message = `${employee.name} ${employee.familyName}  is INTERESTED in road ${updatedRoad.offerName}.`;
                }
            } else if (newNotInterested.length > 0) {
                const employee = await Employee.findById(newNotInterested[0]);
                if (employee) {
                    message = `${employee.name} ${employee.familyName} is NOT INTERESTED in road ${updatedRoad.offerName}.`;
                }
            }

            if (message) {
                // Envoyer la notification aux managers
                const notificationPromises = managers.map(async (manager) => {
                    await sendPushNotification(
                        manager.expoPushToken,
                        message,
                        '(manager)/(tabs)/(Dispatcher)/ExtratRoutes'
                    );
                });

                await Promise.all(notificationPromises);
            }
        }

        res.status(200).json(updatedRoad);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Delete a road
exports.deleteRoad = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const deletedRoad = await Road.findByIdAndDelete(req.params.id);
        if (!deletedRoad) return res.status(500).json({ message: 'Road not found' });
        res.status(200).json({ message: 'Road deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get roads by date
exports.getRoadsByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(500).json({ message: 'Date is required' });

        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const roads = await Road.find({ date });

        if (!roads.length) {
            // Retourne un tableau vide avec un statut 200 au lieu de 500
            return res.status(200).json([]);
        }

        res.status(200).json(roads);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

