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

// Create a new road
exports.createRoad = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const road = new Road(req.body);
        const savedRoad = await road.save();

        // Send notifications to all Expo tokens
        const tokens = req.body.employeeExpo; // Ensure employeeExpo contains an array of tokens
        const notificationPromises = tokens.map(async (token) => {
            if (token) {
                await sendPushNotification(
                    token,
                    'New Routes Offer',
                    ` ${savedRoad.roadNumber} Routes are available starting at ${savedRoad.startTime}.`
                );
            }
        });

        await Promise.all(notificationPromises);
        res.status(200).json(savedRoad);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update a road
exports.updateRoad = async (req, res) => {
    try {
        const Road = req.connection.models.ExtraRoad; // Modèle injecté dynamiquement
        const updatedRoad = await Road.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedRoad) return res.status(500).json({ message: 'Road not found' });
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

